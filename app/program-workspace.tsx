"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, BookCopy, BookOpenCheck, Check, CircleCheck, Cloud, Database, FilePlus2, FileText, KeyRound, LayoutDashboard, LibraryBig, LoaderCircle, LogOut, MessageSquareText, Plus, Save, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import ProgramEditor, { calculateProgramProgress, ReferencesEditor, UniversalReviewSurface, type SectionId } from "./program-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { automaticCriteria, normalizeDisciplineData, normalizeProgramData, pkProgramDataFromDiscipline, rowWorkload, studyPlans, typeMeta, type DisciplineData, type DisciplineRecord, type MaterialRow, type ProgramData, type ProgramRecord, type ProgramType } from "@/lib/program-model";
import { roleLabels, type UserRole } from "@/lib/roles";
import { serverArchitecture } from "@/lib/server-architecture";

type View = "programs" | "disciplines" | "users";
type UserProfile = {
  userId: string;
  displayName: string;
  email: string;
  requestedRole: UserRole;
  role: UserRole;
};

function parseDiscipline(value: string): DisciplineData {
  return normalizeDisciplineData(value);
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-[#253957]">
      <span>{label}</span>
      {children}
      {hint && <span className="text-xs font-normal leading-relaxed text-muted-foreground">{hint}</span>}
    </label>
  );
}

function TypeChooser({ open, onOpenChange, onSelect, busy }: { open: boolean; onOpenChange: (value: boolean) => void; onSelect: (type: ProgramType) => void; busy: boolean }) {
  const cards: { type: ProgramType; note: string; accent: string }[] = [
    {
      type: "DOOP",
      note: "Общеразвивающая программа для взрослых",
      accent: "bg-[#eaf2ff] text-[#1746a2]",
    },
    {
      type: "PK",
      note: "Повышение квалификации, от 16 часов",
      accent: "bg-[#e7f8f3] text-[#087967]",
    },
    {
      type: "PP",
      note: "Профессиональная переподготовка, от 250 часов",
      accent: "bg-[#f1ebff] text-[#6541a7]",
    },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-7 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl text-[#102348]">Какую программу вы хотите создать?</DialogTitle>
          <DialogDescription className="text-base">Выберите тип — откроется форма соответствующего макета.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 pt-2 md:grid-cols-3">
          {cards.map(({ type, note, accent }) => (
            <button key={type} type="button" disabled={busy} onClick={() => onSelect(type)} className="group rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#7ea5e5] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:opacity-50">
              <span className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${accent}`}>{type}</span>
              <span className="block text-lg font-semibold text-[#15294c]">{typeMeta[type].documentTitle}</span>
              <span className="mt-2 block text-sm leading-relaxed text-muted-foreground">{note}</span>
              <span className="mt-5 flex items-center gap-2 text-sm font-semibold text-primary">
                Создать черновик <Plus className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProgramWorkspace({ displayName, email, signOutPath, assignedRole, initialRole }: { displayName: string; email: string; signOutPath: string; assignedRole: UserRole; initialRole: UserRole }) {
  const [role, setRole] = useState<UserRole>(initialRole);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [disciplines, setDisciplines] = useState<DisciplineRecord[]>([]);
  const [activeProgram, setActiveProgram] = useState<ProgramRecord | null>(null);
  const [activeSection, setActiveSection] = useState<SectionId>("passport");
  const [view, setView] = useState<View>("programs");
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [disciplineOpen, setDisciplineOpen] = useState(false);
  const [activeDiscipline, setActiveDiscipline] = useState<DisciplineRecord | null>(null);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const disciplineSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeData = useMemo(() => (activeProgram ? normalizeProgramData(activeProgram.data, activeProgram.type) : null), [activeProgram]);

  useEffect(() => {
    async function loadAll() {
      try {
        const [programResponse, disciplineResponse] = await Promise.all([fetch("/api/programs"), fetch("/api/disciplines")]);
        if (!programResponse.ok || !disciplineResponse.ok) throw new Error("Данные временно недоступны");
        const [{ programs: loadedPrograms }, { disciplines: loadedDisciplines }] = await Promise.all([
          programResponse.json() as Promise<{ programs: ProgramRecord[] }>,
          disciplineResponse.json() as Promise<{
            disciplines: DisciplineRecord[];
          }>,
        ]);
        setPrograms(loadedPrograms);
        setDisciplines(loadedDisciplines);
        if (!loadedPrograms.length && role !== "reviewer") setCreateOpen(true);
        if (role === "admin") {
          const usersResponse = await fetch("/api/admin/users");
          if (usersResponse.ok) setUserProfiles(((await usersResponse.json()) as { users: UserProfile[] }).users);
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    }
    void loadAll();
  }, [role]);

  async function switchWorkingRole(nextRole: UserRole) {
    if (assignedRole !== "admin" || nextRole === role) return;
    setBusy(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actingRole: nextRole }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Не удалось переключить режим");
      setActiveProgram(null);
      setActiveDiscipline(null);
      setDisciplineOpen(false);
      setCreateOpen(false);
      setView("programs");
      setPrograms([]);
      setDisciplines([]);
      setLoading(true);
      setRole(nextRole);
      toast.success(`Включён режим: ${roleLabels[nextRole]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось переключить режим");
    } finally {
      setBusy(false);
    }
  }

  async function createProgram(type: ProgramType) {
    setBusy(true);
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const result = (await response.json()) as {
        program: ProgramRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error);
      setPrograms((items) => [result.program, ...items]);
      setActiveProgram(result.program);
      setActiveSection("passport");
      setView("programs");
      setCreateOpen(false);
      toast.success("Черновик создан");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать черновик");
    } finally {
      setBusy(false);
    }
  }

  function queueProgramSave(next: ProgramRecord) {
    setActiveProgram(next);
    setPrograms((items) => items.map((item) => (item.id === next.id ? next : item)));
    setSaveState("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/programs/${next.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: next.title,
            data: next.data,
            progress: next.progress,
            status: next.status,
            reviewComment: next.reviewComment,
            fieldComments: next.fieldComments,
          }),
        });
        if (!response.ok) throw new Error();
        setSaveState("saved");
      } catch {
        setSaveState("error");
        toast.error("Не удалось сохранить изменения. Введённые данные остались на экране.");
      }
    }, 650);
  }

  function updateProgramData(nextData: ProgramData, title?: string) {
    if (!activeProgram) return;
    queueProgramSave({
      ...activeProgram,
      title: title ?? activeProgram.title,
      data: JSON.stringify(nextData),
      progress: calculateProgramProgress(nextData, activeProgram.type),
      updatedAt: new Date().toISOString(),
    });
    if (activeProgram.type === "PP") {
      const rows = studyPlans(nextData).flatMap((plan) => plan.rows);
      const rowMap = new Map(rows.map((row) => [row.id, row]));
      setDisciplines((items) =>
        items.map((discipline) => {
          if (discipline.programId !== activeProgram.id) return discipline;
          const disciplineData = parseDiscipline(discipline.data);
          const row = rowMap.get(disciplineData.planRowId);
          if (!row) return discipline;
          const synced = {
            ...disciplineData,
            interimAssessment: `${row.attestationKind}: ${row.attestation}`,
            criteria: disciplineData.criteria.trim() ? disciplineData.criteria : automaticCriteria(row.attestation),
          };
          const next = {
            ...discipline,
            title: row.title || discipline.title,
            hours: rowWorkload(row),
            data: JSON.stringify(synced),
            updatedAt: new Date().toISOString(),
          };
          void fetch(`/api/disciplines/${next.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: next.title,
              hours: next.hours,
              data: next.data,
            }),
          });
          return next;
        }),
      );
    }
  }

  function changeStatus(status: ProgramRecord["status"], reviewComment = "") {
    if (!activeProgram) return;
    queueProgramSave({
      ...activeProgram,
      status,
      reviewComment: status === "revision" ? reviewComment : "",
      fieldComments: status === "review" || status === "approved" ? "{}" : activeProgram.fieldComments,
      updatedAt: new Date().toISOString(),
    });
    toast.success(status === "review" ? "Программа отправлена проверяющему" : status === "approved" ? "Программа согласована. Автор получил уведомление" : "Программа возвращена автору на доработку");
  }

  async function updateFieldComments(programId: string, fieldComments: string) {
    const previous = programs.find((program) => program.id === programId);
    if (!previous) return;
    const next = {
      ...previous,
      fieldComments,
      updatedAt: new Date().toISOString(),
    };
    if (activeProgram?.id === programId) setActiveProgram(next);
    setPrograms((items) => items.map((item) => (item.id === next.id ? next : item)));
    setSaveState("saving");
    const response = await fetch(`/api/programs/${next.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fieldComments }),
    });
    if (!response.ok) {
      if (activeProgram?.id === programId) setActiveProgram(previous);
      setPrograms((items) => items.map((item) => (item.id === previous.id ? previous : item)));
      setSaveState("error");
      toast.error("Не удалось сохранить комментарий");
      return;
    }
    setSaveState("saved");
    toast.success("Комментарий к полю сохранён");
  }

  async function deleteProgram(id: string) {
    const response = await fetch(`/api/programs/${id}`, { method: "DELETE" });
    if (!response.ok) return toast.error("Не удалось удалить программу");
    setPrograms((items) => items.filter((item) => item.id !== id));
    setDisciplines((items) => items.filter((item) => item.programId !== id));
    if (activeProgram?.id === id) setActiveProgram(null);
    toast.success("Черновик удалён");
  }

  async function createDiscipline(programId: string, title?: string, hours?: number, seed?: Partial<DisciplineData>, options: { open?: boolean; notify?: boolean } = {}) {
    try {
      const response = await fetch("/api/disciplines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId, title, hours, seed }),
      });
      const result = (await response.json()) as {
        discipline: DisciplineRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(result.error);
      setDisciplines((items) => [...items, result.discipline]);
      if (options.open !== false) {
        setActiveDiscipline(result.discipline);
        setDisciplineOpen(true);
      }
      if (options.notify !== false) toast.success("РПД сохранена отдельно в личном кабинете");
      return result.discipline;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать РПД");
      return null;
    }
  }

  function queueDisciplineSave(next: DisciplineRecord) {
    setActiveDiscipline(next);
    setDisciplines((items) => items.map((item) => (item.id === next.id ? next : item)));
    if (disciplineSaveTimer.current) clearTimeout(disciplineSaveTimer.current);
    disciplineSaveTimer.current = setTimeout(async () => {
      const response = await fetch(`/api/disciplines/${next.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: next.title,
          hours: next.hours,
          data: next.data,
        }),
      });
      if (!response.ok) toast.error("Не удалось сохранить РПД");
    }, 650);
  }

  async function deleteDiscipline(id: string) {
    const response = await fetch(`/api/disciplines/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) return toast.error("Не удалось удалить РПД");
    setDisciplines((items) => items.filter((item) => item.id !== id));
    setDisciplineOpen(false);
    setActiveDiscipline(null);
    toast.success("РПД удалена");
  }

  async function copyProgram(source: ProgramRecord) {
    try {
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: source.type }),
      });
      const created = (await response.json()) as {
        program: ProgramRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(created.error);
      const copy = {
        ...created.program,
        title: `${source.title} — копия`,
        data: source.data,
        progress: source.progress,
        status: "draft" as const,
      };
      const saved = await fetch(`/api/programs/${copy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: copy.title,
          data: copy.data,
          progress: copy.progress,
          status: copy.status,
        }),
      });
      if (!saved.ok) throw new Error("Не удалось сохранить копию");
      setPrograms((items) => [copy, ...items]);
      setActiveProgram(copy);
      setActiveSection("passport");
      toast.success("Создан новый черновик на основе согласованной программы");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать копию");
    }
  }

  async function createPkFromDiscipline(discipline: DisciplineRecord) {
    const sourceProgram = programs.find((program) => program.id === discipline.programId);
    if (!sourceProgram) return toast.error("Не найдена исходная программа ПП");
    setBusy(true);
    try {
      const data = pkProgramDataFromDiscipline(sourceProgram, discipline);
      const response = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "PK" }),
      });
      const created = (await response.json()) as {
        program: ProgramRecord;
        error?: string;
      };
      if (!response.ok) throw new Error(created.error);
      const draft = {
        ...created.program,
        title: discipline.title,
        data: JSON.stringify(data),
        progress: calculateProgramProgress(data, "PK"),
        status: "draft" as const,
      };
      const saved = await fetch(`/api/programs/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title,
          data: draft.data,
          progress: draft.progress,
          status: draft.status,
        }),
      });
      if (!saved.ok) throw new Error("Не удалось сохранить программу ПК");
      setPrograms((items) => [draft, ...items]);
      setActiveProgram(draft);
      setActiveSection("passport");
      setView("programs");
      setDisciplineOpen(false);
      toast.success("Создан черновик ПК на основе выбранной РПД");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Не удалось создать программу ПК");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool?: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: "start_program_creation",
          title: "Начать создание программы",
          description: "Открывает выбор типа новой образовательной программы.",
          inputSchema: {
            type: "object",
            properties: {},
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute: async () => {
            setCreateOpen(true);
            return { state: "type_selection_open" };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);

  const initials = displayName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const ppPrograms = programs.filter((program) => program.type === "PP");

  return (
    <div className="min-h-screen bg-transparent text-[#14213d]">
      <Toaster richColors position="top-right" />
      <TypeChooser open={createOpen} onOpenChange={setCreateOpen} onSelect={createProgram} busy={busy} />
      <DisciplineDialog open={disciplineOpen} onOpenChange={setDisciplineOpen} discipline={activeDiscipline} programs={programs} role={role} onFieldCommentsChange={updateFieldComments} onChange={queueDisciplineSave} onDelete={deleteDiscipline} />
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white/95 px-4 shadow-[0_1px_0_rgb(20_33_61/3%)] backdrop-blur md:px-7">
        <button
          className="flex items-center gap-3"
          onClick={() => {
            setActiveProgram(null);
            setView("programs");
          }}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-bold tracking-tight">Конструктор программ</span>
            <span className="block text-xs text-muted-foreground">ДООП · ПК · ПП</span>
          </span>
        </button>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {activeProgram && (
            <div className="mr-2 hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              {saveState === "saving" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : saveState === "saved" ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : null}
              {saveState === "saving" ? "Сохраняем…" : saveState === "saved" ? "Все изменения сохранены" : "Ошибка сохранения"}
            </div>
          )}
          {assignedRole === "admin" ? (
            <Select value={role} onValueChange={(value) => void switchWorkingRole(value as UserRole)} disabled={busy}>
              <SelectTrigger className="h-9 w-[150px] bg-white sm:w-48" aria-label="Рабочий режим администратора">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Режим администратора</SelectItem>
                <SelectItem value="author">Режим автора</SelectItem>
                <SelectItem value="reviewer">Режим проверяющего</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {roleLabels[role]}
            </Badge>
          )}
          <div className="hidden text-right lg:block">
            <div className="text-sm font-semibold">{displayName}</div>
            <div className="text-xs text-muted-foreground">{email}</div>
          </div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dfeaff] text-xs font-bold text-primary">{initials || <UserRound className="h-4 w-4" />}</span>
          <Button variant="ghost" size="icon" asChild aria-label="Выйти">
            <a href={signOutPath} target="_top">
              <LogOut className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>
      <div className="grid min-h-[calc(100vh-4rem)] md:grid-cols-[235px_minmax(0,1fr)]">
        <aside className="hidden bg-[#102348] px-3 py-5 text-white md:flex md:flex-col">
          <nav className="space-y-1">
            <button
              onClick={() => {
                setView("programs");
                setActiveProgram(null);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${view === "programs" && !activeProgram ? "bg-white/13 text-white" : "text-blue-100/75 hover:bg-white/8"}`}
            >
              <LayoutDashboard className="h-4 w-4" /> {role === "author" ? "Мои программы" : "Программы"}
            </button>
            <button
              onClick={() => {
                setView("disciplines");
                setActiveProgram(null);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${view === "disciplines" ? "bg-white/13 text-white" : "text-blue-100/75 hover:bg-white/8"}`}
            >
              <LibraryBig className="h-4 w-4" /> Библиотека РПД <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs">{disciplines.length}</span>
            </button>
            {role === "admin" && (
              <button
                onClick={() => {
                  setView("users");
                  setActiveProgram(null);
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${view === "users" ? "bg-white/13 text-white" : "text-blue-100/75 hover:bg-white/8"}`}
              >
                <ShieldCheck className="h-4 w-4" /> Роли и доступ
              </button>
            )}
          </nav>
          <div className="mt-auto rounded-xl border border-white/10 bg-white/6 p-3">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ShieldCheck className="h-4 w-4 text-[#7fb4ff]" /> {assignedRole === "admin" ? `Администратор · ${roleLabels[role]}` : roleLabels[role]}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-blue-100/55">{assignedRole === "admin" ? "Рабочий режим можно переключить в верхней панели." : "Роль назначается администратором после регистрации."}</p>
          </div>
        </aside>
        <main className="min-w-0 pb-20 md:pb-0">
          {loading ? (
            <LoadingState />
          ) : activeProgram && activeData ? (
            <ProgramEditor
              program={activeProgram}
              data={activeData}
              section={activeSection}
              setSection={setActiveSection}
              disciplines={disciplines.filter((item) => item.programId === activeProgram.id)}
              role={role}
              onBack={() => setActiveProgram(null)}
              onDataChange={updateProgramData}
              onStatusChange={changeStatus}
              onFieldCommentsChange={(fieldComments) => updateFieldComments(activeProgram.id, fieldComments)}
              onCreateDiscipline={createDiscipline}
              onDisciplineChange={queueDisciplineSave}
              onOpenDiscipline={(discipline) => {
                setActiveDiscipline(discipline);
                setDisciplineOpen(true);
              }}
            />
          ) : view === "users" && role === "admin" ? (
            <UserRolesPanel users={userProfiles} onChange={setUserProfiles} />
          ) : view === "disciplines" ? (
            <DisciplineLibrary
              disciplines={disciplines}
              programs={ppPrograms}
              onOpen={(discipline) => {
                setActiveDiscipline(discipline);
                setDisciplineOpen(true);
              }}
              onCreate={createDiscipline}
              onUseAsBasis={createPkFromDiscipline}
              readOnly={role === "reviewer"}
              busy={busy}
            />
          ) : (
            <Dashboard programs={programs} disciplines={disciplines} role={role} onCreate={() => setCreateOpen(true)} onOpen={setActiveProgram} onDelete={deleteProgram} onCopy={copyProgram} />
          )}
        </main>
      </div>
      <nav className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-3 rounded-2xl border bg-white/95 p-1.5 shadow-[0_12px_45px_rgb(16_35_72/24%)] backdrop-blur md:hidden">
        <button
          onClick={() => {
            setView("programs");
            setActiveProgram(null);
          }}
          className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] text-muted-foreground"
        >
          <LayoutDashboard className="h-4 w-4" />
          Программы
        </button>
        {role !== "reviewer" ? (
          <button onClick={() => setCreateOpen(true)} className="flex flex-col items-center gap-1 rounded-xl bg-primary py-2 text-[11px] font-semibold text-white">
            <Plus className="h-4 w-4" />
            Создать
          </button>
        ) : (
          <span className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            Проверка
          </span>
        )}
        <button
          onClick={() => {
            setView("disciplines");
            setActiveProgram(null);
          }}
          className="flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] text-muted-foreground"
        >
          <LibraryBig className="h-4 w-4" />
          РПД
        </button>
      </nav>
    </div>
  );
}

function UserRolesPanel({ users, onChange }: { users: UserProfile[]; onChange: (users: UserProfile[]) => void }) {
  async function assignRole(userId: string, role: UserRole) {
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) return toast.error(result.error || "Не удалось назначить роль");
    onChange(users.map((user) => (user.userId === userId ? { ...user, role } : user)));
    toast.success("Роль пользователя обновлена");
  }
  return (
    <div className="mx-auto max-w-6xl p-5 md:p-10">
      <div>
        <p className="text-sm font-semibold text-primary">Администрирование</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#102348]">Роли и доступ</h1>
        <p className="mt-2 text-sm text-muted-foreground">После регистрации пользователь получает роль автора. Проверяющего или администратора назначает администратор.</p>
      </div>
      <Alert className="mt-6 border-blue-200 bg-blue-50">
        <ShieldCheck className="h-4 w-4" />
        <AlertTitle>Роль нельзя выбрать самостоятельно</AlertTitle>
        <AlertDescription>Это исключает получение прав проверяющего или администратора при регистрации.</AlertDescription>
      </Alert>
      <section className="mt-6">
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-[#102348]">Серверная архитектура</h2>
          <p className="mt-1 text-sm text-muted-foreground">Способ хранения не выбирается пользователем: все рабочие данные сохраняются только на сервере после авторизации.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Card className="rounded-2xl">
            <CardContent className="flex gap-3 p-5">
              <Database className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Серверная БД</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Сейчас: {serverArchitecture.database.activeProvider}. При переносе: {serverArchitecture.database.migrationTarget}.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="flex gap-3 p-5">
              <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Обязательный вход</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Сейчас: {serverArchitecture.authentication.activeProvider}. При переносе: {serverArchitecture.authentication.migrationTarget}.
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="flex gap-3 p-5">
              <Cloud className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <p className="font-semibold">Без локального режима</p>
                <p className="mt-1 text-sm text-muted-foreground">Программы, РПД, роли, статусы и комментарии не хранятся в браузере.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      <div className="mt-6 overflow-x-auto rounded-2xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Пользователь</TableHead>
              <TableHead>Электронная почта</TableHead>
              <TableHead>Желаемая роль</TableHead>
              <TableHead>Назначенная роль</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="font-semibold">{user.displayName || "Без имени"}</TableCell>
                <TableCell>{user.email || "—"}</TableCell>
                <TableCell>{roleLabels[user.requestedRole] ?? "—"}</TableCell>
                <TableCell>
                  <Select value={user.role} onValueChange={(value) => void assignRole(user.userId, value as UserRole)}>
                    <SelectTrigger className="w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
            {!users.length && (
              <TableRow>
                <TableCell colSpan={4} className="h-28 text-center text-muted-foreground">
                  Пользователи появятся после первого входа.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="mx-auto max-w-6xl p-6 md:p-10">
      <div className="mb-8 h-9 w-72 animate-pulse rounded-xl bg-slate-200" />
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
    </div>
  );
}

function Dashboard({ programs, disciplines, role, onCreate, onOpen, onDelete, onCopy }: { programs: ProgramRecord[]; disciplines: DisciplineRecord[]; role: UserRole; onCreate: () => void; onOpen: (program: ProgramRecord) => void; onDelete: (id: string) => void; onCopy: (program: ProgramRecord) => void }) {
  const [status, setStatus] = useState("all");
  const [programType, setProgramType] = useState("all");
  const normalizeStatus = (value: ProgramRecord["status"]) => (value === "ready" ? "approved" : value);
  const statusLabels: Record<string, string> = {
    draft: "Черновик",
    review: "На проверке",
    approved: "Согласована",
    revision: "На доработке",
  };
  const visible = programs.filter((program) => (status === "all" || normalizeStatus(program.status) === status) && (programType === "all" || program.type === programType));
  return (
    <div className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">{role === "author" ? "Личный кабинет автора" : role === "reviewer" ? "Кабинет проверяющего" : "Кабинет администратора"}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#102348]">{role === "author" ? "Мои образовательные программы" : "Образовательные программы"}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Черновики, программы на проверке, доработке и согласованные версии хранятся в одном списке.</p>
        </div>
        {role !== "reviewer" && (
          <Button onClick={onCreate} size="lg" className="rounded-xl">
            <FilePlus2 className="h-4 w-4" /> Новая программа
          </Button>
        )}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Всего программ" value={programs.length} icon={Archive} />
        <StatCard label="Согласовано" value={programs.filter((program) => normalizeStatus(program.status) === "approved").length} icon={CircleCheck} />
        <StatCard label="Отдельных РПД" value={disciplines.length} icon={LibraryBig} />
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-56 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {Object.entries(statusLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={programType} onValueChange={setProgramType}>
          <SelectTrigger className="w-52 bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            <SelectItem value="DOOP">ДООП</SelectItem>
            <SelectItem value="PK">ПК</SelectItem>
            <SelectItem value="PP">ПП</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {visible.length ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {visible.map((program) => {
            const programStatus = normalizeStatus(program.status);
            return (
              <Card key={program.id} className="rounded-2xl border-0 shadow-[0_7px_30px_rgb(28_55_99/7%)]">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-2">
                      <Badge>{program.type}</Badge>
                      <Badge variant="outline">{statusLabels[programStatus]}</Badge>
                    </div>
                    {role !== "reviewer" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить эту программу?</AlertDialogTitle>
                            <AlertDialogDescription>Программа и связанные с ней РПД будут удалены.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => onDelete(program.id)}>
                              Удалить
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                  <CardTitle className="line-clamp-2 text-lg">{program.title}</CardTitle>
                  <CardDescription>{typeMeta[program.type].name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Заполнено</span>
                    <b>{program.progress}%</b>
                  </div>
                  <Progress value={program.progress} className="mt-2" />
                  <div className="mt-5 flex flex-wrap justify-end gap-2">
                    {role !== "reviewer" && programStatus === "approved" && (
                      <Button variant="outline" onClick={() => onCopy(program)}>
                        <BookCopy className="h-4 w-4" /> Взять за основу
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpen(program)}>
                      Открыть
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="mt-6 border-dashed py-12 text-center">
          <CardContent>
            <FilePlus2 className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-xl font-semibold">Программ по фильтру нет</h2>
            {role !== "reviewer" && (
              <Button className="mt-5" onClick={onCreate}>
                Создать программу
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Archive }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eaf2ff] text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DisciplineLibrary({ disciplines, programs, onOpen, onCreate, onUseAsBasis, readOnly, busy }: { disciplines: DisciplineRecord[]; programs: ProgramRecord[]; onOpen: (record: DisciplineRecord) => void; onCreate: (programId: string) => void; onUseAsBasis: (record: DisciplineRecord) => void; readOnly: boolean; busy: boolean }) {
  const [selectedProgram, setSelectedProgram] = useState(programs[0]?.id ?? "");
  return (
    <div className="mx-auto max-w-6xl p-5 md:p-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#6541a7]">Отдельное хранение для ПП</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Библиотека рабочих программ дисциплин</h1>
          <p className="mt-2 text-sm text-muted-foreground">Любую РПД можно открыть для редактирования или взять за основу новой программы повышения квалификации.</p>
        </div>
        {!readOnly && programs.length > 0 && (
          <div className="flex gap-2">
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-64 bg-white">
                <SelectValue placeholder="Выберите программу ПП" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => onCreate(selectedProgram)} disabled={!selectedProgram}>
              <Plus className="h-4 w-4" /> Новая РПД
            </Button>
          </div>
        )}
      </div>
      {!programs.length ? (
        <Alert className="mt-8">
          <AlertTitle>Нет доступных программ ПП</AlertTitle>
          <AlertDescription>Рабочие программы дисциплин появятся после создания программы профессиональной переподготовки.</AlertDescription>
        </Alert>
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {disciplines.map((discipline) => (
            <Card key={discipline.id} className="cursor-pointer rounded-2xl border-0 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" onClick={() => onOpen(discipline)}>
              <CardHeader>
                <BookOpenCheck className="h-6 w-6 text-violet-700" />
                <CardTitle className="pt-2 text-lg">{discipline.title}</CardTitle>
                <CardDescription>{programs.find((program) => program.id === discipline.programId)?.title}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <Badge variant="outline">{discipline.hours} ч.</Badge>
                {!readOnly && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={(event) => {
                      event.stopPropagation();
                      onUseAsBasis(discipline);
                    }}
                  >
                    <BookCopy className="h-4 w-4" /> Взять за основу
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DisciplineDialog({ open, onOpenChange, discipline, programs, role, onFieldCommentsChange, onChange, onDelete }: { open: boolean; onOpenChange: (value: boolean) => void; discipline: DisciplineRecord | null; programs: ProgramRecord[]; role: UserRole; onFieldCommentsChange: (programId: string, fieldComments: string) => void; onChange: (record: DisciplineRecord) => void; onDelete: (id: string) => void }) {
  if (!discipline) return null;
  const program = programs.find((item) => item.id === discipline.programId);
  if (!program) return null;
  const readOnly = role === "reviewer";
  const data = parseDiscipline(discipline.data);
  const update = <K extends keyof DisciplineData>(key: K, value: DisciplineData[K]) => {
    if (!readOnly)
      onChange({
        ...discipline,
        data: JSON.stringify({ ...data, [key]: value }),
        updatedAt: new Date().toISOString(),
      });
  };
  const listEditor = (label: string, items: string[], key: "competenceItems" | "knowledgeItems" | "skillItems" | "masteryItems") => (
    <div className="grid gap-3">
      <h3 className="text-sm font-semibold">{label}</h3>
      {(items.length ? items : [""]).map((value, index) => (
        <div key={index} className="flex gap-2">
          <Textarea
            rows={2}
            value={value}
            onChange={(event) =>
              update(
                key,
                (items.length ? items : [""]).map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
              )
            }
          />
          <Button
            variant="ghost"
            size="icon"
            disabled={items.length <= 1}
            onClick={() =>
              update(
                key,
                items.filter((_, itemIndex) => itemIndex !== index),
              )
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button className="w-fit" variant="outline" onClick={() => update(key, [...(items.length ? items : [""]), ""])}>
        <Plus className="h-4 w-4" /> Добавить
      </Button>
    </div>
  );
  const materialRows = data.materialRows.length ? data.materialRows : [{ id: crypto.randomUUID(), room: "", activity: "", equipment: "" }];
  const setMaterial = (id: string, key: keyof MaterialRow, value: string) =>
    update(
      "materialRows",
      materialRows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  const linked = Boolean(data.planRowId);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-0 sm:max-w-5xl">
        <div className="sticky top-0 z-10 border-b bg-white px-7 py-5">
          <DialogHeader>
            <Badge className="w-fit bg-violet-100 text-violet-800">{linked ? "РПД · синхронизация с учебным планом" : "РПД · отдельный черновик"}</Badge>
            <DialogTitle className="text-2xl">Рабочая программа дисциплины</DialogTitle>
            <DialogDescription>{program.title}</DialogDescription>
          </DialogHeader>
        </div>
        <UniversalReviewSurface role={role} status={program.status} section={`rpd:${discipline.id}`} fieldComments={program.fieldComments} onFieldCommentsChange={(fieldComments) => onFieldCommentsChange(program.id, fieldComments)}>
          <div className="grid gap-6 px-7 py-6">
            {readOnly && (
              <Alert className="border-blue-200 bg-blue-50">
                <MessageSquareText className="h-4 w-4" />
                <AlertTitle>Рецензирование РПД</AlertTitle>
                <AlertDescription>Нажмите на любую строку, цифру или ячейку, чтобы оставить точечный комментарий.</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-5 md:grid-cols-[1fr_150px]">
              <Field label="Наименование дисциплины" hint={linked ? "Синхронизируется с учебным планом." : "Свяжите РПД через строку учебного плана для автосинхронизации."}>
                <Input value={discipline.title} readOnly={linked} className={linked ? "bg-slate-50" : ""} onChange={(event) => onChange({ ...discipline, title: event.target.value })} />
              </Field>
              <Field label="Трудоёмкость, ч." hint={linked ? "Из учебного плана." : "Укажите вручную."}>
                <Input
                  type="number"
                  value={discipline.hours}
                  readOnly={linked}
                  className={linked ? "bg-slate-50" : ""}
                  onChange={(event) =>
                    onChange({
                      ...discipline,
                      hours: Number(event.target.value),
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Цель освоения дисциплины">
              <Textarea rows={4} value={data.purpose} onChange={(event) => update("purpose", event.target.value)} />
            </Field>
            <div className="grid items-start gap-5 lg:grid-cols-4">
              {listEditor("Компетенции", data.competenceItems, "competenceItems")}
              {listEditor("Знать", data.knowledgeItems, "knowledgeItems")}
              {listEditor("Уметь", data.skillItems, "skillItems")}
              {listEditor("Владеть", data.masteryItems, "masteryItems")}
            </div>
            <Field label="Темы и содержание дисциплины">
              <Textarea rows={7} value={data.topics} onChange={(event) => update("topics", event.target.value)} />
            </Field>
            <div className="grid gap-5 md:grid-cols-2">
              <Field label="Текущий контроль" hint="Заполняется в РПД и сохраняется вместе с дисциплиной.">
                <Textarea rows={3} value={data.currentControl} onChange={(event) => update("currentControl", event.target.value)} />
              </Field>
              <Field label="Промежуточная аттестация" hint={linked ? "Вид и форма синхронизируются с учебным планом." : "Укажите вручную."}>
                <Textarea rows={3} value={data.interimAssessment} readOnly={linked} className={linked ? "bg-slate-50" : ""} onChange={(event) => update("interimAssessment", event.target.value)} />
              </Field>
            </div>
            <Field label="Оценочные материалы">
              <Textarea rows={5} value={data.assessmentMaterials} onChange={(event) => update("assessmentMaterials", event.target.value)} />
            </Field>
            <Field label="Критерии оценки">
              <Textarea rows={4} value={data.criteria || automaticCriteria(data.interimAssessment)} onChange={(event) => update("criteria", event.target.value)} />
            </Field>
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Материально-технические условия</h3>
                <Button
                  variant="outline"
                  onClick={() =>
                    update("materialRows", [
                      ...materialRows,
                      {
                        id: crypto.randomUUID(),
                        room: "",
                        activity: "",
                        equipment: "",
                      },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" /> Добавить строку
                </Button>
              </div>
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Помещение</TableHead>
                      <TableHead>Вид занятий</TableHead>
                      <TableHead>Оборудование и ПО</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materialRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Textarea value={row.room} onChange={(event) => setMaterial(row.id, "room", event.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Textarea value={row.activity} onChange={(event) => setMaterial(row.id, "activity", event.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Textarea value={row.equipment} onChange={(event) => setMaterial(row.id, "equipment", event.target.value)} />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={materialRows.length === 1}
                            onClick={() =>
                              update(
                                "materialRows",
                                materialRows.filter((item) => item.id !== row.id),
                              )
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <ReferencesEditor items={data.referenceItems} onChange={(items) => update("referenceItems", items)} />
            <div className="flex justify-between border-t pt-5">
              <span className="flex items-center gap-2 text-xs text-emerald-700">
                <Save className="h-4 w-4" /> Автосохранение
              </span>
              <Button variant="ghost" className="text-destructive" onClick={() => onDelete(discipline.id)}>
                <Trash2 className="h-4 w-4" /> Удалить РПД
              </Button>
            </div>
          </div>
        </UniversalReviewSurface>
      </DialogContent>
    </Dialog>
  );
}
