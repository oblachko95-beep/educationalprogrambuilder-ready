import { desc, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getDb } from "@/db";
import { programs } from "@/db/schema";
import { emptyProgramData, typeMeta, type ProgramType } from "@/lib/program-model";
import { ensureUserProfile } from "@/lib/user-profile";
import { effectiveUserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  try {
    const profile = await ensureUserProfile(user);
    const role = effectiveUserRole(profile);
    const rows = role === "admin" ? await getDb().select().from(programs).orderBy(desc(programs.updatedAt)) : role === "reviewer" ? await getDb().select().from(programs).where(eq(programs.status, "review")).orderBy(desc(programs.updatedAt)) : await getDb().select().from(programs).where(eq(programs.userId, user.userId)).orderBy(desc(programs.updatedAt));
    return Response.json({ programs: rows });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось загрузить программы" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  try {
    const profile = await ensureUserProfile(user);
    if (effectiveUserRole(profile) === "reviewer") return Response.json({ error: "Проверяющий не создаёт программы за автора" }, { status: 403 });
    const payload = (await request.json()) as { type?: ProgramType };
    if (!payload.type || !typeMeta[payload.type]) return Response.json({ error: "Выберите тип программы" }, { status: 400 });
    const now = new Date().toISOString();
    const row = {
      id: crypto.randomUUID(), userId: user.userId, type: payload.type,
      title: `Новая программа — ${typeMeta[payload.type].short}`,
      status: "draft" as const, progress: 0, data: JSON.stringify(emptyProgramData(payload.type)), reviewComment: "", fieldComments: "{}", createdAt: now, updatedAt: now,
    };
    await getDb().insert(programs).values(row);
    return Response.json({ program: row }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Не удалось создать программу" }, { status: 500 });
  }
}
