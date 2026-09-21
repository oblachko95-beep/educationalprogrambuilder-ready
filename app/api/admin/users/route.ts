import { eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getDb } from "@/db";
import { userProfiles } from "@/db/schema";
import { ensureUserProfile } from "@/lib/user-profile";
import type { UserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  const profile = await ensureUserProfile(user);
  return profile.role === "admin" ? profile : null;
}

export async function GET() {
  if (!await requireAdmin()) return Response.json({ error: "Доступно только администратору" }, { status: 403 });
  const users = await getDb().select().from(userProfiles).orderBy(userProfiles.createdAt);
  return Response.json({ users });
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin();
  if (!admin) return Response.json({ error: "Доступно только администратору" }, { status: 403 });
  const payload = await request.json() as { userId?: string; role?: UserRole };
  if (!payload.userId || !payload.role || !["author", "reviewer", "admin"].includes(payload.role)) return Response.json({ error: "Выберите пользователя и роль" }, { status: 400 });
  if (payload.userId === admin.userId && payload.role !== "admin") return Response.json({ error: "Администратор не может снять собственную роль" }, { status: 400 });
  const [profile] = await getDb().update(userProfiles).set({ role: payload.role, actingRole: payload.role, updatedAt: new Date().toISOString() }).where(eq(userProfiles.userId, payload.userId)).returning();
  if (!profile) return Response.json({ error: "Пользователь не найден" }, { status: 404 });
  return Response.json({ profile });
}
