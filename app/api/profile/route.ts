import { getAuthenticatedUser } from "@/lib/server-auth";
import { ensureUserProfile } from "@/lib/user-profile";
import { roleLabels } from "@/lib/roles";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userProfiles } from "@/db/schema";
import type { UserRole } from "@/lib/roles";
import { effectiveUserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  const profile = await ensureUserProfile(user);
  const activeRole = effectiveUserRole(profile);
  return Response.json({ profile: { ...profile, activeRole, roleLabel: roleLabels[activeRole] } });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  const profile = await ensureUserProfile(user);
  if (profile.role !== "admin") return Response.json({ error: "Переключение режима доступно только администратору" }, { status: 403 });
  const payload = await request.json() as { actingRole?: UserRole };
  if (!payload.actingRole || !["author", "reviewer", "admin"].includes(payload.actingRole)) return Response.json({ error: "Выберите рабочий режим" }, { status: 400 });
  const [updated] = await getDb().update(userProfiles).set({ actingRole: payload.actingRole, updatedAt: new Date().toISOString() }).where(eq(userProfiles.userId, user.userId)).returning();
  return Response.json({ profile: { ...updated, activeRole: payload.actingRole, roleLabel: roleLabels[payload.actingRole] } });
}
