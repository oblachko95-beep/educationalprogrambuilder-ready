import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userProfiles } from "@/db/schema";
import type { AuthenticatedUser } from "@/lib/server-auth";
export type { UserRole } from "@/lib/roles";

function configuredAdminEmails() {
  return [process.env.INITIAL_ADMIN_EMAIL, process.env.PROGRAM_ADMIN_EMAILS]
    .filter(Boolean)
    .join(",")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function ensureUserProfile(user: AuthenticatedUser) {
  const db = getDb();
  const [existing] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  const now = new Date().toISOString();
  const isConfiguredAdmin = configuredAdminEmails().includes(user.email.trim().toLowerCase());
  if (!existing) {
    const role = isConfiguredAdmin ? "admin" as const : "author" as const;
    const row = { userId: user.userId, displayName: user.displayName, email: user.email, requestedRole: "author" as const, role, actingRole: role, createdAt: now, updatedAt: now };
    await db.insert(userProfiles).values(row).onConflictDoNothing();
  } else if (existing.displayName !== user.displayName || existing.email !== user.email || (isConfiguredAdmin && existing.role !== "admin")) {
    await db.update(userProfiles).set({ displayName: user.displayName, email: user.email, ...(isConfiguredAdmin && existing.role !== "admin" ? { role: "admin" as const, actingRole: "admin" as const } : {}), updatedAt: now }).where(eq(userProfiles.userId, user.userId));
  }
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, user.userId)).limit(1);
  return profile;
}
