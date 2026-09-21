import { asc, eq } from "drizzle-orm";
import { getAuthenticatedUser } from "@/lib/server-auth";
import { getDb } from "@/db";
import { disciplines, programs } from "@/db/schema";
import { buildProgramDocx, exportFileName } from "@/lib/program-export";
import { criticalValidationErrors, normalizeProgramData, type ProgramType } from "@/lib/program-model";
import { ensureUserProfile } from "@/lib/user-profile";
import { effectiveUserRole } from "@/lib/roles";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Требуется вход" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const profile = await ensureUserProfile(user);
  const role = effectiveUserRole(profile);
  const [program] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  if (!program) return Response.json({ error: "Программа не найдена" }, { status: 404 });
  if (role === "author" && program.userId !== user.userId) return Response.json({ error: "Нет доступа" }, { status: 403 });
  if (role === "author" && !["approved", "ready"].includes(program.status)) return Response.json({ error: "Выгрузка станет доступна после согласования программы" }, { status: 403 });
  if (role === "reviewer" && program.status !== "review") return Response.json({ error: "Нет доступа" }, { status: 403 });

  const type = program.type as ProgramType;
  const data = normalizeProgramData(program.data, type);
  const programDisciplines = type === "PP" ? await db.select().from(disciplines).where(eq(disciplines.programId, id)).orderBy(asc(disciplines.sortOrder)) : [];
  const criticalErrors = criticalValidationErrors(data, type, programDisciplines);
  if (criticalErrors.length) {
    return Response.json(
      {
        error: "Выгрузка недоступна: исправьте критические ошибки.",
        issues: criticalErrors,
      },
      { status: 422 },
    );
  }

  const buffer = await buildProgramDocx(
    { title: program.title, type },
    data,
    programDisciplines.map((record) => ({
      title: record.title,
      hours: record.hours,
      data: record.data,
    })),
  );
  const safeName = exportFileName({ title: program.title, type }, data);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    },
  });
}
