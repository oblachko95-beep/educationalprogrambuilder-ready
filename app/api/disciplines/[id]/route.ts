import { and, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getDb } from "@/db";
import { disciplines } from "@/db/schema";
import { ensureUserProfile } from "@/lib/user-profile";
import { effectiveUserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  const { id } = await params;
  const profile = await ensureUserProfile(user);
  const role = effectiveUserRole(profile);
  if (role === "reviewer") return Response.json({ error: "Проверяющий не изменяет РПД за автора" }, { status: 403 });
  const payload = (await request.json()) as { title?: string; hours?: number; data?: unknown };
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (typeof payload.title === "string" && payload.title.trim()) updates.title = payload.title.trim();
  if (payload.hours !== undefined) updates.hours = Math.max(0, Number(payload.hours) || 0);
  if (payload.data !== undefined) updates.data = typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data);
  const condition = role === "admin" ? eq(disciplines.id, id) : and(eq(disciplines.id, id), eq(disciplines.userId, user.userId));
  const [row] = await getDb().update(disciplines).set(updates).where(condition).returning();
  if (!row) return Response.json({ error: "РПД не найдена" }, { status: 404 });
  return Response.json({ discipline: row });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  const { id } = await params;
  const profile = await ensureUserProfile(user);
  const role = effectiveUserRole(profile);
  if (role === "reviewer") return Response.json({ error: "Нет доступа" }, { status: 403 });
  const condition = role === "admin" ? eq(disciplines.id, id) : and(eq(disciplines.id, id), eq(disciplines.userId, user.userId));
  const [row] = await getDb().delete(disciplines).where(condition).returning({ id: disciplines.id });
  if (!row) return Response.json({ error: "РПД не найдена" }, { status: 404 });
  return Response.json({ deleted: true });
}
