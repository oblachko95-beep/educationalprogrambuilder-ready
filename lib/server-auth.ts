import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { authSessions, authUsers, passwordResetTokens, userProfiles } from "@/db/schema";
import type { UserRole } from "@/lib/roles";

export type AuthenticatedUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

export type RegisterInput = {
  email: string;
  password: string;
  displayName: string;
  requestedRole: UserRole;
};

export const SESSION_COOKIE_NAME = "epb_session";
const SESSION_TTL_DAYS = 14;
const RESET_TOKEN_TTL_MINUTES = 30;

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const tokenHash = await hashToken(token);
  const [session] = await getDb().select().from(authSessions).where(eq(authSessions.tokenHash, tokenHash)).limit(1);
  if (!session) return null;
  if (Date.parse(session.expiresAt) <= Date.now()) {
    await getDb().delete(authSessions).where(eq(authSessions.id, session.id));
    return null;
  }

  const [user] = await getDb().select().from(authUsers).where(eq(authUsers.id, session.userId)).limit(1);
  if (!user) return null;

  return {
    userId: user.id,
    displayName: user.displayName || user.email,
    email: user.email,
    fullName: user.displayName || null,
  };
}

export async function requireAuthenticatedUser(returnTo: string): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();
  if (user) return user;
  redirect(authenticatedSignInPath(returnTo));
}

export function authenticatedSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/login?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function authenticatedSignOutPath(returnTo = "/login"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `/api/auth/logout?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export async function registerWithPassword(input: RegisterInput) {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();
  const displayName = input.displayName.trim() || email;
  const requestedRole = normalizeRole(input.requestedRole);

  if (!email) throw new AuthError("Введите корректную электронную почту");
  validatePassword(password);

  const [existing] = await getDb().select({ id: authUsers.id }).from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (existing) throw new AuthError("Пользователь с такой почтой уже зарегистрирован");

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();
  const passwordHash = await bcrypt.hash(password, 12);
  const role = isBootstrapAdmin(email) ? "admin" : "author";

  await getDb().insert(authUsers).values({ id: userId, email, passwordHash, displayName, createdAt: now, updatedAt: now });
  await getDb().insert(userProfiles).values({
    userId,
    displayName,
    email,
    requestedRole,
    role,
    actingRole: role,
    createdAt: now,
    updatedAt: now,
  });

  return createSessionForUser(userId);
}

export async function signInWithPassword(emailValue: string, passwordValue: string) {
  const email = normalizeEmail(emailValue);
  const password = passwordValue.trim();
  if (!email || !password) throw new AuthError("Введите email и пароль");

  const [user] = await getDb().select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (!user) throw new AuthError("Неверный email или пароль");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw new AuthError("Неверный email или пароль");

  if (isBootstrapAdmin(user.email)) {
    const now = new Date().toISOString();
    await getDb().update(userProfiles).set({ role: "admin", actingRole: "admin", updatedAt: now }).where(eq(userProfiles.userId, user.id));
  }

  return createSessionForUser(user.id);
}

export async function createPasswordReset(emailValue: string, origin: string) {
  const email = normalizeEmail(emailValue);
  if (!email) throw new AuthError("Введите корректную электронную почту");

  const [user] = await getDb().select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
  if (!user) return { resetUrl: null };

  const token = createRandomToken();
  const tokenHash = await hashToken(token);
  const now = new Date();
  const expires = new Date(now.getTime() + RESET_TOKEN_TTL_MINUTES * 60_000);
  await getDb().insert(passwordResetTokens).values({
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash,
    expiresAt: expires.toISOString(),
    usedAt: null,
    createdAt: now.toISOString(),
  });

  return { resetUrl: `${origin}/reset-password?token=${encodeURIComponent(token)}` };
}

export async function resetPassword(token: string, passwordValue: string) {
  const cleanToken = token.trim();
  const password = passwordValue.trim();
  validatePassword(password);
  if (!cleanToken) throw new AuthError("Ссылка восстановления недействительна");

  const tokenHash = await hashToken(cleanToken);
  const [row] = await getDb().select().from(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, tokenHash)).limit(1);
  if (!row || row.usedAt || Date.parse(row.expiresAt) <= Date.now()) throw new AuthError("Ссылка восстановления истекла или уже использована");

  const now = new Date().toISOString();
  const passwordHash = await bcrypt.hash(password, 12);
  await getDb().update(authUsers).set({ passwordHash, updatedAt: now }).where(eq(authUsers.id, row.userId));
  await getDb().update(passwordResetTokens).set({ usedAt: now }).where(eq(passwordResetTokens.id, row.id));
  await getDb().delete(authSessions).where(eq(authSessions.userId, row.userId));

  return createSessionForUser(row.userId);
}

export async function deleteCurrentSession(token: string | undefined) {
  if (!token) return;
  const tokenHash = await hashToken(token);
  await getDb().delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
}

export function sessionCookie(token: string, expiresAt: Date) {
  return serializeCookie(SESSION_COOKIE_NAME, token, {
    expires: expiresAt,
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function expiredSessionCookie() {
  return serializeCookie(SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isAuthError(error: unknown): error is AuthError {
  return error instanceof AuthError;
}

class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

async function createSessionForUser(userId: string) {
  const token = createRandomToken();
  const tokenHash = await hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await getDb().insert(authSessions).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
  return { token, expiresAt };
}

function configuredAdminEmails() {
  const values = [process.env.INITIAL_ADMIN_EMAIL, process.env.PROGRAM_ADMIN_EMAILS]
    .filter(Boolean)
    .join(",");
  return values
    .split(",")
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

function isBootstrapAdmin(email: string) {
  return configuredAdminEmails().includes(normalizeEmail(email));
}

function normalizeRole(value: UserRole): UserRole {
  return ["author", "reviewer", "admin"].includes(value) ? value : "author";
}

function validatePassword(password: string) {
  if (password.length < 8) throw new AuthError("Пароль должен быть не короче 8 символов");
}

function createRandomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function hashToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return base64UrlEncode(new Uint8Array(digest));
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (["/login", "/register", "/forgot-password", "/reset-password"].includes(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

type CookieOptions = {
  expires: Date;
  httpOnly: boolean;
  sameSite: "Lax" | "Strict" | "None";
  secure: boolean;
  path: string;
};

function serializeCookie(name: string, value: string, options: CookieOptions) {
  const encoded = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  const parts = [
    encoded,
    `Expires=${options.expires.toUTCString()}`,
    `Path=${options.path}`,
    `SameSite=${options.sameSite}`,
  ];
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  return parts.join("; ");
}
