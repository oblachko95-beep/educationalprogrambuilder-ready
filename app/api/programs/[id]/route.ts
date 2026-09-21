import { and, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getDb } from "@/db";
import { disciplines, programs } from "@/db/schema";
import { ensureUserProfile } from "@/lib/user-profile";
import { effectiveUserRole } from "@/lib/roles";
import { criticalValidationErrors, normalizeProgramData, type ProgramType } from "@/lib/program-model";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  const { id } = await params;
  try {
    const payload = (await request.json()) as {
      title?: string;
      data?: unknown;
      progress?: number;
      status?: "draft" | "review" | "approved" | "revision" | "ready";
      reviewComment?: string;
      fieldComments?: string;
    };
    const profile = await ensureUserProfile(user);
    const role = effectiveUserRole(profile);
    const [existing] = await getDb().select().from(programs).where(eq(programs.id, id)).limit(1);
    if (!existing) return Response.json({ error: "Программа не найдена" }, { status: 404 });
    if (role === "author" && existing.userId !== user.userId) return Response.json({ error: "Нет доступа" }, { status: 403 });
    if (role === "author" && payload.status && payload.status !== existing.status && payload.status !== "review")
      return Response.json(
        {
          error: "Только проверяющий может согласовать программу или вернуть её на доработку",
        },
        { status: 403 },
      );
    if (role === "reviewer") {
      const changesDecision = payload.status && ["approved", "revision"].includes(payload.status);
      const changesFieldComments = typeof payload.fieldComments === "string";
      if (existing.status !== "review" || (!changesDecision && !changesFieldComments))
        return Response.json(
          {
            error: "Проверяющий может комментировать поля, согласовать программу или вернуть её на доработку",
          },
          { status: 403 },
        );
      if (payload.status && !changesDecision) return Response.json({ error: "Недопустимый переход статуса" }, { status: 403 });
      if (payload.status === "revision") {
        const comments = payload.fieldComments ?? existing.fieldComments;
        let hasFieldComment = false;
        try {
          hasFieldComment = Object.values(JSON.parse(comments) as Record<string, { text?: string }>).some((item) => item?.text?.trim());
        } catch {
          hasFieldComment = false;
        }
        if (!payload.reviewComment?.trim() && !hasFieldComment)
          return Response.json(
            {
              error: "Перед возвратом оставьте общее замечание или комментарий к полю",
            },
            { status: 400 },
          );
      }
    }
    if (payload.status === "review") {
      const type = existing.type as ProgramType;
      const candidate = normalizeProgramData(typeof payload.data === "string" ? payload.data : payload.data !== undefined ? JSON.stringify(payload.data) : existing.data, type);
      const programDisciplines = type === "PP" ? await getDb().select().from(disciplines).where(eq(disciplines.programId, id)) : [];
      const errors = criticalValidationErrors(candidate, type, programDisciplines);
      if (errors.length)
        return Response.json(
          {
            error: "Программа содержит критические ошибки и не может быть отправлена на проверку",
            issues: errors,
          },
          { status: 422 },
        );
    }
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if (role !== "reviewer" && typeof payload.title === "string" && payload.title.trim()) updates.title = payload.title.trim();
    if (role !== "reviewer" && payload.data !== undefined) updates.data = typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data);
    if (role !== "reviewer" && typeof payload.progress === "number") updates.progress = Math.max(0, Math.min(100, Math.round(payload.progress)));
    if (payload.status && ["draft", "review", "approved", "revision", "ready"].includes(payload.status)) updates.status = payload.status;
    if (typeof payload.reviewComment === "string") updates.reviewComment = payload.reviewComment.trim();
    if ((role === "reviewer" || role === "admin") && typeof payload.fieldComments === "string") updates.fieldComments = payload.fieldComments;
    if (payload.status === "review" || payload.status === "approved") {
      updates.reviewComment = "";
      updates.fieldComments = "{}";
    }
    const [row] = await getDb().update(programs).set(updates).where(eq(programs.id, id)).returning();
    if (!row) return Response.json({ error: "Программа не найдена" }, { status: 404 });
    return Response.json({ program: row });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Не удалось сохранить программу",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });
  const { id } = await params;
  const profile = await ensureUserProfile(user);
  const role = effectiveUserRole(profile);
  if (role === "reviewer") return Response.json({ error: "Нет доступа" }, { status: 403 });
  const condition = role === "admin" ? eq(programs.id, id) : and(eq(programs.id, id), eq(programs.userId, user.userId));
  const [row] = await getDb().delete(programs).where(condition).returning({ id: programs.id });
  if (!row) return Response.json({ error: "Программа не найдена" }, { status: 404 });
  return Response.json({ deleted: true });
}
