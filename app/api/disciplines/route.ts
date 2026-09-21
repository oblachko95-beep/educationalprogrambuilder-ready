import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getDb } from "@/db";
import { disciplines, programs } from "@/db/schema";
import { emptyDisciplineData, type DisciplineData } from "@/lib/program-model";
import { ensureUserProfile } from "@/lib/user-profile";
import { effectiveUserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  const profile = await ensureUserProfile(user);
  const role = effectiveUserRole(profile);
  const programId = new URL(request.url).searchParams.get("programId");
  const db = getDb();
  if (role === "reviewer") {
    const reviewPrograms = await db.select({ id: programs.id }).from(programs).where(eq(programs.status, "review"));
    const programIds = reviewPrograms.map((program) => program.id);
    if (!programIds.length || (programId && !programIds.includes(programId))) return Response.json({ disciplines: [] });
    const where = programId ? eq(disciplines.programId, programId) : inArray(disciplines.programId, programIds);
    const rows = await db.select().from(disciplines).where(where).orderBy(asc(disciplines.sortOrder), desc(disciplines.updatedAt));
    return Response.json({ disciplines: rows });
  }
  const where = role === "admin" ? (programId ? eq(disciplines.programId, programId) : undefined) : (programId ? and(eq(disciplines.userId, user.userId), eq(disciplines.programId, programId)) : eq(disciplines.userId, user.userId));
  const rows = await db.select().from(disciplines).where(where).orderBy(asc(disciplines.sortOrder), desc(disciplines.updatedAt));
  return Response.json({ disciplines: rows });
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  const profile = await ensureUserProfile(user);
  const role = effectiveUserRole(profile);
  if (role === "reviewer") return Response.json({ error: "Проверяющий не создаёт РПД за автора" }, { status: 403 });
  const payload = (await request.json()) as { programId?: string; title?: string; hours?: number; seed?: Partial<DisciplineData> };
  if (!payload.programId) return Response.json({ error: "Не выбрана программа" }, { status: 400 });
  const programCondition = role === "admin" ? eq(programs.id, payload.programId) : and(eq(programs.id, payload.programId), eq(programs.userId, user.userId));
  const [owner] = await getDb().select({ id: programs.id, type: programs.type, userId: programs.userId }).from(programs).where(programCondition).limit(1);
  if (!owner || owner.type !== "PP") return Response.json({ error: "РПД можно создать только для программы ПП" }, { status: 400 });
  const now = new Date().toISOString();
  const existing = await getDb().select({ sortOrder: disciplines.sortOrder }).from(disciplines).where(and(eq(disciplines.userId, owner.userId), eq(disciplines.programId, payload.programId))).orderBy(desc(disciplines.sortOrder)).limit(1);
  const row = { id: crypto.randomUUID(), programId: payload.programId, userId: owner.userId, title: payload.title?.trim() || "Новая дисциплина", hours: Math.max(0, Number(payload.hours) || 0), sortOrder: (existing[0]?.sortOrder ?? -1) + 1, data: JSON.stringify({ ...emptyDisciplineData, ...(payload.seed ?? {}) }), createdAt: now, updatedAt: now };
  await getDb().insert(disciplines).values(row);
  return Response.json({ discipline: row }, { status: 201 });
}
