"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpenCheck, CheckCircle2, Download, ExternalLink, FileText, GraduationCap, Info, ListChecks, MessageSquareText, Plus, Settings2, ShieldCheck, Sparkles, Trash2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { automaticCriteria, criticalValidationErrors, emptyReferenceItem, finalAssessmentKindOptions, formatReference, goalText, normalizeDisciplineData, resolvedFinalAssessmentKind, rowContactTotal, rowDistanceTotal, rowWorkload, sectionProgramControl, sectionTopicTotals, studyPlans as getStudyPlans, studyPlanTotal, typeMeta, type DigitalRow, type DisciplineData, type DisciplineRecord, type MaterialRow, type PlanRow, type ProgramData, type ProgramRecord, type SectionTopicRow, type ProgramType, type ReferenceItem, type StudyPlan } from "@/lib/program-model";
import type { UserRole } from "@/lib/roles";

export type SectionId = "passport" | "general" | "results" | "plan" | "sections" | "assessment" | "conditions" | "review";

const sections: { id: SectionId; label: string; icon: typeof FileText }[] = [
  { id: "passport", label: "Паспорт", icon: FileText },
  { id: "general", label: "Общая характеристика", icon: GraduationCap },
  { id: "results", label: "Результаты обучения", icon: BookOpenCheck },
  { id: "plan", label: "Учебный план", icon: ListChecks },
  { id: "sections", label: "Рабочие программы", icon: FileText },
  { id: "assessment", label: "Оценка качества", icon: ShieldCheck },
  { id: "conditions", label: "Условия реализации", icon: Settings2 },
  { id: "review", label: "Проверка и выгрузка", icon: Download },
];

const currentControlOptions = ["Устный опрос", "Письменный опрос", "Контрольная работа", "Домашнее задание", "Тестирование", "Отчёт", "Практическое задание", "Иное"];
const assessmentOptions = ["Зачёт", "Экзамен"];
const attestationKinds = ["Не выбран", "Письменная работа", "Устный ответ", "Тестирование", "Практическое задание", "Защита работы"];

type ReviewFieldNote = {
  label: string;
  text: string;
  url?: string;
  quote?: string;
};
type ReviewFieldNotes = Record<string, ReviewFieldNote>;
type ReviewContextValue = {
  role: UserRole;
  status: ProgramRecord["status"];
  section: string;
  prefix: string;
  notes: ReviewFieldNotes;
  onChange: (notes: ReviewFieldNotes) => void;
};

const ReviewCommentsContext = createContext<ReviewContextValue | null>(null);

function parseFieldNotes(value: string): ReviewFieldNotes {
  try {
    return JSON.parse(value || "{}") as ReviewFieldNotes;
  } catch {
    return {};
  }
}

function ReviewAnnotation({ label, fieldKey }: { label: string; fieldKey?: string }) {
  const context = useContext(ReviewCommentsContext);
  const key = `${context?.section ?? "field"}:${context?.prefix ? `${context.prefix}:` : ""}${fieldKey ?? label.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-")}`;
  const note = context?.notes[key];
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(note?.text ?? "");
  const [url, setUrl] = useState(note?.url ?? "");
  if (!context) return null;
  const canComment = (context.role === "reviewer" || context.role === "admin") && context.status === "review";
  const canSee = Boolean(note?.text) && (canComment || context.status === "revision");
  const safeUrl = note?.url && /^https?:\/\//i.test(note.url) ? note.url : "";
  const save = () => {
    const next = { ...context.notes };
    if (text.trim()) next[key] = { label, text: text.trim(), url: url.trim() || undefined };
    else delete next[key];
    context.onChange(next);
    setOpen(false);
  };
  return (
    <div className="font-normal">
      {canComment && (
        <Button
          data-review-comment
          type="button"
          variant={note?.text ? "secondary" : "outline"}
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setOpen((value) => !value);
          }}
        >
          {note?.text ? (
            <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-xs font-black leading-none text-white">
              !
            </span>
          ) : (
            <MessageSquareText className="h-3.5 w-3.5" />
          )}
          {note?.text ? "Есть комментарий" : "Комментарий"}
        </Button>
      )}
      {open && canComment && (
        <div data-review-comment-panel className="mt-2 grid gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3" onClick={(event) => event.stopPropagation()}>
          <Textarea className="!pointer-events-auto" rows={3} value={text} onChange={(event) => setText(event.target.value)} placeholder="Что нужно исправить в этом поле?" />
          <Input className="!pointer-events-auto" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Ссылка на источник или пример — необязательно" />
          <div className="flex justify-end gap-2">
            <Button data-review-comment type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button data-review-comment type="button" size="sm" onClick={save}>
              {text.trim() ? "Сохранить" : "Удалить комментарий"}
            </Button>
          </div>
        </div>
      )}
      {canSee && !open && (
        <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-950">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-sm font-black leading-none text-white">
              !
            </span>
            Замечание проверяющего
          </div>
          <p className="whitespace-pre-wrap">{note?.text}</p>
          {safeUrl && (
            <a className="mt-2 inline-flex items-center gap-1 font-semibold text-primary underline underline-offset-2" href={safeUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Открыть приложенную ссылку
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ReviewCommentScope({ prefix, children }: { prefix: string; children: React.ReactNode }) {
  const context = useContext(ReviewCommentsContext);
  if (!context) return children;
  return (
    <ReviewCommentsContext.Provider
      value={{
        ...context,
        prefix: context.prefix ? `${context.prefix}.${prefix}` : prefix,
      }}
    >
      {children}
    </ReviewCommentsContext.Provider>
  );
}

const universalTargets = "input, textarea, button[role='combobox'], td, th, p, h2, h3, h4, li, [data-slot='badge']";

function stableReviewChildren(element: HTMLElement) {
  return Array.from(element.children).filter((child) => !child.textContent?.includes("Нажмите на любую строку, цифру или ячейку, чтобы оставить точечный комментарий."));
}

function elementPath(root: HTMLElement, element: HTMLElement) {
  const parts: number[] = [];
  let current: HTMLElement | null = element;
  while (current && current !== root) {
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) break;
    parts.unshift(stableReviewChildren(parent).indexOf(current));
    current = parent;
  }
  return parts.join(".");
}

function elementFromPath(root: HTMLElement, path: string) {
  let current: HTMLElement | null = root;
  for (const part of path.split(".").filter(Boolean)) current = current ? (stableReviewChildren(current)[Number(part)] as HTMLElement | null) : null;
  return current;
}

function reviewTargetLabel(element: HTMLElement, line?: number) {
  if (element instanceof HTMLTextAreaElement) {
    const lines = element.value.split("\n");
    const lineNumber = Math.min(Math.max(line ?? 0, 0), Math.max(lines.length - 1, 0));
    return {
      label: `Строка ${lineNumber + 1} многострочного поля`,
      quote: lines[lineNumber]?.trim() || "Пустая строка",
    };
  }
  if (element instanceof HTMLInputElement) {
    const value = element.value.trim();
    const label = element.type === "number" ? `Числовое значение${value ? ` «${value}»` : ""}` : element.getAttribute("aria-label") || element.placeholder || "Поле ввода";
    return { label, quote: value || "Поле пока не заполнено" };
  }
  if (element.tagName === "TD" || element.tagName === "TH") {
    const cell = element as HTMLTableCellElement;
    const text = cell.innerText.trim().replace(/\s+/g, " ");
    return {
      label: `Таблица: строка ${cell.parentElement?.rowIndex + 1 || 1}, колонка ${cell.cellIndex + 1}`,
      quote: text || "Пустая ячейка",
    };
  }
  const text = element.innerText.trim().replace(/\s+/g, " ");
  return {
    label: text ? `Фрагмент «${text.slice(0, 80)}${text.length > 80 ? "…" : ""}»` : "Элемент программы",
    quote: text.slice(0, 300) || "Пустой элемент",
  };
}

function textareaLineAt(element: HTMLTextAreaElement, clientY: number) {
  const style = getComputedStyle(element);
  const lineHeight = Number.parseFloat(style.lineHeight) || 20;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const y = clientY - element.getBoundingClientRect().top + element.scrollTop - paddingTop;
  return Math.max(0, Math.floor(y / lineHeight));
}

function UniversalReviewLayer({ children }: { children: React.ReactNode }) {
  const context = useContext(ReviewCommentsContext);
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [activeKey, setActiveKey] = useState("");
  const [activeLabel, setActiveLabel] = useState("");
  const [activeQuote, setActiveQuote] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [viewKeys, setViewKeys] = useState<string[]>([]);
  const [markers, setMarkers] = useState<Array<{ path: string; keys: string[]; top: number; left: number }>>([]);
  const canComment = Boolean(context && (context.role === "reviewer" || context.role === "admin") && context.status === "review");
  const canView = Boolean(context && (context.status === "revision" || canComment));
  const prefix = context ? `universal:${context.section}:` : "";

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !context || !canView) {
      setMarkers([]);
      return;
    }
    const measure = () => {
      root.querySelectorAll<HTMLElement>("[data-has-review-note]").forEach((element) => element.removeAttribute("data-has-review-note"));
      const groups = new Map<string, string[]>();
      Object.entries(context.notes).forEach(([key, note]) => {
        if (!key.startsWith(prefix) || !note.text?.trim()) return;
        const path = key.slice(prefix.length).split(":line:")[0];
        groups.set(path, [...(groups.get(path) ?? []), key]);
      });
      const rootRect = root.getBoundingClientRect();
      const next = Array.from(groups.entries()).flatMap(([path, keys]) => {
        const element = elementFromPath(root, path);
        if (!element) return [];
        element.setAttribute("data-has-review-note", "true");
        const rect = element.getBoundingClientRect();
        return [
          {
            path,
            keys,
            top: rect.top - rootRect.top - 9,
            left: Math.min(rect.right - rootRect.left + 4, root.clientWidth - 30),
          },
        ];
      });
      setMarkers(next);
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener("resize", measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      root.querySelectorAll<HTMLElement>("[data-has-review-note]").forEach((element) => element.removeAttribute("data-has-review-note"));
    };
  }, [canView, context, prefix]);

  if (!context) return <>{children}</>;

  const openEditor = (element: HTMLElement, clientY?: number) => {
    const root = rootRef.current;
    if (!root) return;
    const path = elementPath(root, element);
    const line = element instanceof HTMLTextAreaElement && typeof clientY === "number" ? textareaLineAt(element, clientY) : undefined;
    const key = `${prefix}${path}${line === undefined ? "" : `:line:${line + 1}`}`;
    const details = reviewTargetLabel(element, line);
    const note = context.notes[key];
    setActiveKey(key);
    setActiveLabel(details.label);
    setActiveQuote(details.quote);
    setText(note?.text ?? "");
    setUrl(note?.url ?? "");
    setViewKeys([key]);
    setOpen(true);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canComment) return;
    const origin = event.target as HTMLElement;
    if (origin.closest("[data-review-comment], [data-review-comment-panel]")) return;
    event.preventDefault();
    event.stopPropagation();
    const target = origin.closest<HTMLElement>(universalTargets);
    if (target && rootRef.current?.contains(target)) openEditor(target, event.clientY);
  };

  const save = () => {
    if (!activeKey) return;
    const next = { ...context.notes };
    if (text.trim())
      next[activeKey] = {
        label: activeLabel,
        quote: activeQuote,
        text: text.trim(),
        url: url.trim() || undefined,
      };
    else delete next[activeKey];
    context.onChange(next);
    setOpen(false);
  };

  const shownNotes = viewKeys.map((key) => context.notes[key]).filter((note): note is ReviewFieldNote => Boolean(note?.text));
  return (
    <div
      ref={rootRef}
      data-universal-review={canComment ? "active" : "view"}
      className={`relative ${canComment ? "[&_input]:cursor-crosshair [&_textarea]:cursor-crosshair [&_td]:cursor-crosshair [&_th]:cursor-crosshair [&_p]:cursor-crosshair [&_h2]:cursor-crosshair [&_h3]:cursor-crosshair [&_h4]:cursor-crosshair" : ""}`}
      onPointerDownCapture={handlePointerDown}
      onKeyDownCapture={(event) => {
        if (canComment && !(event.target as HTMLElement).closest("[data-review-comment-panel]")) {
          event.preventDefault();
          event.stopPropagation();
        }
      }}
    >
      {children}
      {markers.map((marker) => (
        <button
          data-review-comment
          key={marker.path}
          type="button"
          className="absolute z-20 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-amber-500 text-white shadow-md transition hover:scale-105 hover:bg-amber-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300"
          style={{ top: marker.top, left: marker.left }}
          title="Есть комментарий проверяющего"
          aria-label={`Есть комментарий проверяющего. Открыть комментарии: ${marker.keys.length}`}
          onClick={() => {
            const first = context.notes[marker.keys[0]];
            setViewKeys(marker.keys);
            setActiveKey(marker.keys[0]);
            setActiveLabel(first?.label ?? "Комментарий");
            setActiveQuote(first?.quote ?? "");
            setText(first?.text ?? "");
            setUrl(first?.url ?? "");
            setOpen(true);
          }}
        >
          <span aria-hidden className="text-base font-black leading-none">
            !
          </span>
        </button>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-review-comment-panel className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{canComment ? "Комментарий к выбранному элементу" : "Замечания проверяющего"}</DialogTitle>
            <DialogDescription>{canComment ? "Комментарий сохранится именно у этой строки, цифры или ячейки." : "Исправьте указанный фрагмент и повторно отправьте программу на проверку."}</DialogDescription>
          </DialogHeader>
          {activeQuote && (
            <div className="rounded-xl border bg-slate-50 p-3 text-sm">
              <div className="text-xs font-semibold text-muted-foreground">{activeLabel}</div>
              <p className="mt-1 whitespace-pre-wrap">{activeQuote}</p>
            </div>
          )}
          {canComment ? (
            <div className="grid gap-3">
              <Textarea rows={5} value={text} onChange={(event) => setText(event.target.value)} placeholder="Напишите, что именно нужно исправить" />
              <Input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Ссылка на источник или пример — необязательно" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Отмена
                </Button>
                <Button onClick={save}>{text.trim() ? "Сохранить комментарий" : "Удалить комментарий"}</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3">
              {shownNotes.map((note, index) => (
                <div key={index} className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
                  <div className="font-semibold text-amber-950">{note.label}</div>
                  {note.quote && <p className="mt-1 text-xs text-amber-800">Фрагмент: {note.quote}</p>}
                  <p className="mt-2 whitespace-pre-wrap text-amber-950">{note.text}</p>
                  {note.url && /^https?:\/\//i.test(note.url) && (
                    <a className="mt-2 inline-flex items-center gap-1 font-semibold text-primary underline" href={note.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Открыть ссылку
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function UniversalReviewSurface({ role, status, section, fieldComments, onFieldCommentsChange, children }: { role: UserRole; status: ProgramRecord["status"]; section: string; fieldComments: string; onFieldCommentsChange: (fieldComments: string) => void; children: React.ReactNode }) {
  const notes = useMemo(() => parseFieldNotes(fieldComments), [fieldComments]);
  return (
    <ReviewCommentsContext.Provider
      value={{
        role,
        status,
        section,
        prefix: "",
        notes,
        onChange: (next) => onFieldCommentsChange(JSON.stringify(next)),
      }}
    >
      <UniversalReviewLayer>{children}</UniversalReviewLayer>
    </ReviewCommentsContext.Provider>
  );
}

export function calculateProgramProgress(data: ProgramData, type: ProgramType) {
  const plans = getStudyPlans(data);
  const checks = [data.institute, data.manager, type === "DOOP" ? data.actuality : goalText(data, type), type === "DOOP" || (type === "PK" ? data.competenceItems.filter((item) => item.trim()).length >= 2 : data.competenceItems.some(Boolean)), type === "PK" ? data.knowledgeItems.filter((item) => item.trim()).length >= 2 : data.knowledgeItems.some(Boolean), data.skillItems.some(Boolean), plans.every((plan) => plan.rows.length >= 2), data.materialRows.some((row) => row.room && row.activity && row.equipment), data.referenceItems.filter((item) => item.title.trim() && item.year.trim()).length >= 2, data.staffConditions];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function resolvedCurrentControl(row: PlanRow) {
  return row.currentControl === "Иное" ? row.currentControlOther.trim() : row.currentControl.trim();
}

function validationFor(type: ProgramType, data: ProgramData, disciplines: DisciplineRecord[]) {
  const issues: { tone: "error" | "warning" | "ok"; text: string }[] = [];
  const plans = getStudyPlans(data);
  const primary = plans[0];
  const total = primary ? studyPlanTotal(primary) : 0;
  const planTotal = primary ? primary.rows.reduce((sum, row) => sum + rowWorkload(row), 0) : 0;
  const contact = primary ? primary.rows.reduce((sum, row) => sum + rowContactTotal(row), 0) : 0;
  const contactShare = total ? Math.round((contact / total) * 100) : 0;
  const criticalErrors = criticalValidationErrors(data, type, disciplines);
  criticalErrors.forEach((text) => issues.push({ tone: "error", text }));
  const shareValid = data.learningForm === "очная" ? contactShare >= 65 && contactShare <= 100 : data.learningForm === "очно-заочная" ? contactShare >= 20 && contactShare <= 64 : contactShare <= 20;
  if (total && !shareValid)
    issues.push({
      tone: "warning",
      text: `Доля контактной работы ${contactShare}% не соответствует форме «${data.learningForm}».`,
    });
  const invalidDistance = plans.flatMap((plan) => plan.rows).filter((row) => rowDistanceTotal(row) > rowContactTotal(row));
  if (invalidDistance.length)
    issues.push({
      tone: "error",
      text: `Дистанционные часы превышают объём контактной работы в ${invalidDistance.length} строках.`,
    });
  const uniqueRows = new Set(plans.flatMap((plan) => plan.rows.map((row) => row.id))).size;
  if (type === "PP" && uniqueRows > disciplines.length)
    issues.push({
      tone: "warning",
      text: `Для дисциплин учебных планов создано РПД: ${disciplines.length} из ${uniqueRows}.`,
    });
  const softwareText = data.digitalRows.map((row) => `${row.resource} ${row.equipment}`).join(" ");
  if (/(zoom|teams|google meet|adobe connect)/i.test(softwareText))
    issues.push({
      tone: "error",
      text: "Указано зарубежное ПО. Для реализации программы допускается только российское программное обеспечение.",
    });
  const currentYear = new Date().getFullYear();
  const years = data.referenceItems.map((item) => Number(item.year)).filter((year) => Number.isInteger(year) && year > 0 && year <= currentYear);
  if (years.length && years.filter((year) => year >= currentYear - 4).length / years.length < 0.5)
    issues.push({
      tone: "warning",
      text: "Менее 50% источников литературы изданы за последние пять лет.",
    });
  if (!issues.length)
    issues.push({
      tone: "ok",
      text: "Автоматическая проверка не обнаружила критических расхождений.",
    });
  return {
    issues,
    total,
    planTotal,
    contactShare,
    hasCritical: criticalErrors.length > 0,
  };
}

function Field({ label, hint, children, fieldKey, reviewable = true }: { label: string; hint?: string; children: React.ReactNode; fieldKey?: string; reviewable?: boolean }) {
  return (
    <div className="grid gap-2 text-sm font-semibold text-[#253957]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{label}</span>
        {reviewable && <ReviewAnnotation label={label} fieldKey={fieldKey} />}
      </div>
      {children}
      {hint && <span className="text-xs font-normal leading-relaxed text-muted-foreground">{hint}</span>}
    </div>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6 border-b pb-5">
      <h2 className="text-2xl font-semibold tracking-tight text-[#102348]">{title}</h2>
      <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function SystemField({ label, value, onChange, pending }: { label: string; value: string; onChange: (value: string) => void; pending?: boolean }) {
  return (
    <Field label={label} hint={pending ? "После подключения поле будет заполняться из системы «Парус». Пока значение вводится вручную." : "Значение загружается из системы «Парус», но его можно отредактировать."}>
      <div className="relative">
        <Input value={value} onChange={(event) => onChange(event.target.value)} className="pr-24" />
        <Badge variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-800">
          Парус
        </Badge>
      </div>
    </Field>
  );
}

function ListFields({ label, hint, items, onChange, addLabel, minItems = 1 }: { label: string; hint: string; items: string[]; onChange: (items: string[]) => void; addLabel: string; minItems?: number }) {
  const values = items.length >= minItems ? items : [...items, ...Array.from({ length: minItems - items.length }, () => "")];
  return (
    <div className="grid gap-3">
      <div>
        <h3 className="text-sm font-semibold text-[#253957]">{label}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      {values.map((value, index) => (
        <div key={index} className="grid gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-[#e8f0ff] text-xs font-bold text-primary">{index + 1}</span>
            <Textarea rows={2} value={value} onChange={(event) => onChange(values.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))} />
            <Button type="button" variant="ghost" size="icon" aria-label="Удалить поле" disabled={values.length <= minItems} onClick={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <ReviewAnnotation label={`${label} ${index + 1}`} fieldKey={`${label}.${index}`} />
        </div>
      ))}
      <Button type="button" variant="outline" className="w-fit" onClick={() => onChange([...values, ""])}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

export default function ProgramEditor({ program, data, section, setSection, disciplines, role, onBack, onDataChange, onStatusChange, onFieldCommentsChange, onCreateDiscipline, onDisciplineChange, onOpenDiscipline }: { program: ProgramRecord; data: ProgramData; section: SectionId; setSection: (id: SectionId) => void; disciplines: DisciplineRecord[]; role: UserRole; onBack: () => void; onDataChange: (data: ProgramData, title?: string) => void; onStatusChange: (status: ProgramRecord["status"], reviewComment?: string) => void; onFieldCommentsChange: (fieldComments: string) => void; onCreateDiscipline: (programId: string, title?: string, hours?: number, seed?: Partial<DisciplineData>, options?: { open?: boolean; notify?: boolean }) => Promise<DisciplineRecord | null>; onDisciplineChange: (record: DisciplineRecord) => void; onOpenDiscipline: (record: DisciplineRecord) => void }) {
  const validation = useMemo(() => validationFor(program.type, data, disciplines), [program.type, data, disciplines]);
  const creatingRows = useRef(new Set<string>());
  useEffect(() => {
    if (program.type !== "PP" || program.status === "approved" || program.status === "ready") return;
    const linked = new Set(disciplines.map((item) => normalizeDisciplineData(item.data).planRowId));
    getStudyPlans(data)
      .flatMap((plan) => plan.rows)
      .filter((row) => row.title.trim() && !linked.has(row.id) && !creatingRows.current.has(row.id))
      .forEach((row) => {
        creatingRows.current.add(row.id);
        const topicRow: SectionTopicRow = {
          id: crypto.randomUUID(),
          topic: row.title,
          lectures: "",
          lectureHours: row.lectures,
          labs: "",
          labHours: row.labs,
          practice: "",
          practiceHours: row.practice,
          selfStudy: "",
          selfStudyHours: row.selfStudy,
        };
        void onCreateDiscipline(
          program.id,
          row.title,
          rowWorkload(row),
          {
            planRowId: row.id,
            competenceItems: ["", ""],
            knowledgeItems: ["", ""],
            skillItems: ["", ""],
            masteryItems: ["", ""],
            topicRows: [topicRow],
            currentControl: resolvedCurrentControl(row),
            interimAssessment: `${row.attestationKind}: ${row.attestation}`,
            criteria: automaticCriteria(row.attestation),
            referenceItems: [emptyReferenceItem(), emptyReferenceItem()],
          },
          { open: false, notify: false },
        ).finally(() => creatingRows.current.delete(row.id));
      });
  }, [program.id, program.type, program.status, data, disciplines, onCreateDiscipline]);
  const fieldNotes = useMemo(() => parseFieldNotes(program.fieldComments), [program.fieldComments]);
  const fieldNoteCount = Object.values(fieldNotes).filter((note) => note.text?.trim()).length;
  const sectionCommentCounts = useMemo(() => {
    const counts = Object.fromEntries(sections.map(({ id }) => [id, 0])) as Record<SectionId, number>;
    Object.entries(fieldNotes).forEach(([key, note]) => {
      if (!note.text?.trim()) return;
      const sectionId = (key.startsWith("universal:") ? key.split(":")[1] : key.split(":")[0]) as SectionId;
      if (sectionId in counts) counts[sectionId] += 1;
    });
    if (program.reviewComment?.trim()) counts.review += 1;
    return counts;
  }, [fieldNotes, program.reviewComment]);
  const update = <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => onDataChange({ ...data, [key]: value });
  const currentIndex = sections.findIndex((item) => item.id === section);
  const move = (delta: number) => setSection(sections[Math.max(0, Math.min(sections.length - 1, currentIndex + delta))].id);
  const locked = program.status === "approved" || program.status === "ready";
  const canExport = role !== "author" || locked;

  return (
    <ReviewCommentsContext.Provider
      value={{
        role,
        status: program.status,
        section,
        prefix: "",
        notes: fieldNotes,
        onChange: (notes) => onFieldCommentsChange(JSON.stringify(notes)),
      }}
    >
      <div className="min-h-[calc(100vh-4rem)]">
        <div className="border-b bg-white px-5 py-4 md:px-8">
          <div className="mx-auto flex max-w-[1500px] items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{program.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {
                    {
                      draft: "Черновик",
                      review: "На проверке",
                      approved: "Согласована",
                      revision: "На доработке",
                      ready: "Согласована",
                    }[program.status]
                  }
                </span>
              </div>
              <h1 className="mt-1 truncate text-lg font-semibold">{program.title}</h1>
            </div>
            <div className="ml-auto hidden w-44 sm:block">
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Готовность</span>
                <span>{program.progress}%</span>
              </div>
              <Progress value={program.progress} />
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-[1500px] gap-6 p-4 md:p-7 xl:grid-cols-[220px_minmax(0,1fr)_285px]">
          <aside className="rounded-2xl bg-white p-2 shadow-sm xl:sticky xl:top-24 xl:h-fit">
            {sections.map(({ id, label, icon: Icon }, index) => {
              const commentCount = sectionCommentCounts[id];
              return (
                <button key={id} onClick={() => setSection(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${section === id ? "bg-[#e8f0ff] font-semibold text-primary" : "text-[#55657f] hover:bg-slate-50"}`}>
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${section === id ? "bg-primary text-white" : "bg-slate-100"}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    {index + 1}. {label}
                  </span>
                  {commentCount > 0 && (
                    <span title={`Комментариев в разделе: ${commentCount}`} aria-label={`Комментариев в разделе: ${commentCount}`} className="flex min-w-7 items-center justify-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-xs font-black leading-none text-white shadow-sm">
                      <span aria-hidden>!</span>
                      <span>{commentCount}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </aside>
          <Card className="min-w-0 rounded-2xl border-0 shadow-[0_8px_30px_rgb(20_44_88/7%)]">
            <CardContent className="p-5 md:p-8">
              {(program.status === "approved" || program.status === "ready") && section !== "review" && (
                <Alert className="mb-5 border-emerald-200 bg-emerald-50">
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle>Согласованная версия защищена</AlertTitle>
                  <AlertDescription>Чтобы внести изменения, вернитесь в кабинет и выберите «Взять за основу».</AlertDescription>
                </Alert>
              )}
              {program.status === "revision" && program.reviewComment && section !== "review" && (
                <Alert className="mb-5 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Замечания проверяющего</AlertTitle>
                  <AlertDescription className="whitespace-pre-wrap">{program.reviewComment}</AlertDescription>
                </Alert>
              )}
              {program.status === "revision" && fieldNoteCount > 0 && section !== "review" && (
                <Alert className="mb-5 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Комментарии проверяющего: {fieldNoteCount}</AlertTitle>
                  <AlertDescription>Элементы с замечаниями выделены жёлтой рамкой и знаком «!». Нажмите на «!», чтобы прочитать комментарий.</AlertDescription>
                </Alert>
              )}
              {role === "reviewer" && section !== "review" && (
                <Alert className="mb-5 border-blue-200 bg-blue-50">
                  <MessageSquareText className="h-4 w-4" />
                  <AlertTitle>Универсальный режим рецензирования</AlertTitle>
                  <AlertDescription>Нажмите на любое поле, отдельную строку многострочного текста, число, заголовок или ячейку таблицы — комментарий привяжется именно к выбранному элементу. Содержание программы при этом не изменяется.</AlertDescription>
                </Alert>
              )}
              {section === "review" ? (
                <EditorSection type={program.type} program={program} data={data} section={section} role={role} update={update} onDataChange={onDataChange} onStatusChange={onStatusChange} disciplines={disciplines} onCreateDiscipline={onCreateDiscipline} onDisciplineChange={onDisciplineChange} onOpenDiscipline={onOpenDiscipline} validation={validation} />
              ) : (
                <div className={locked ? "pointer-events-none opacity-70" : ""}>
                  <UniversalReviewLayer>
                    <EditorSection type={program.type} program={program} data={data} section={section} role={role} update={update} onDataChange={onDataChange} onStatusChange={onStatusChange} disciplines={disciplines} onCreateDiscipline={onCreateDiscipline} onDisciplineChange={onDisciplineChange} onOpenDiscipline={onOpenDiscipline} validation={validation} />
                  </UniversalReviewLayer>
                </div>
              )}
              <div className="mt-9 flex items-center justify-between border-t pt-5">
                <Button variant="outline" onClick={() => move(-1)} disabled={currentIndex === 0}>
                  <ArrowLeft className="h-4 w-4" /> Назад
                </Button>
                {currentIndex < sections.length - 1 ? (
                  <Button onClick={() => move(1)}>
                    Далее <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : !canExport ? (
                  <Button disabled title="Выгрузка доступна автору после согласования программы">
                    <Download className="h-4 w-4" /> После согласования
                  </Button>
                ) : validation.hasCritical ? (
                  <Button disabled title="Исправьте критические ошибки">
                    <Download className="h-4 w-4" /> Выгрузка недоступна
                  </Button>
                ) : (
                  <Button asChild>
                    <a href={`/api/export/${program.id}`}>
                      <Download className="h-4 w-4" /> Выгрузить DOCX
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <aside className="h-fit rounded-2xl border bg-white p-5 shadow-sm xl:sticky xl:top-24">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Проверка программы</h2>
            </div>
            <div className="mt-4 space-y-3">
              {validation.issues.slice(0, 4).map((issue, index) => (
                <div key={index} className={`rounded-xl p-3 text-xs leading-relaxed ${issue.tone === "error" ? "bg-red-50 text-red-800" : issue.tone === "warning" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                  <span className="flex gap-2">
                    {issue.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
                    {issue.text}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t pt-4 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Учебных планов</span>
                <b className="text-foreground">{getStudyPlans(data).length}</b>
              </div>
              <div className="mt-2 flex justify-between">
                <span>Первый план</span>
                <b className="text-foreground">{validation.planTotal} ч.</b>
              </div>
              <div className="mt-2 flex justify-between">
                <span>С итоговой аттестацией</span>
                <b className="text-foreground">{validation.total} ч.</b>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ReviewCommentsContext.Provider>
  );
}

function EditorSection({ type, program, data, section, role, update, onDataChange, onStatusChange, disciplines, onCreateDiscipline, onDisciplineChange, onOpenDiscipline, validation }: { type: ProgramType; program: ProgramRecord; data: ProgramData; section: SectionId; role: UserRole; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void; onDataChange: (data: ProgramData, title?: string) => void; onStatusChange: (status: ProgramRecord["status"], reviewComment?: string) => void; disciplines: DisciplineRecord[]; onCreateDiscipline: (programId: string, title?: string, hours?: number, seed?: Partial<DisciplineData>, options?: { open?: boolean; notify?: boolean }) => Promise<DisciplineRecord | null>; onDisciplineChange: (record: DisciplineRecord) => void; onOpenDiscipline: (record: DisciplineRecord) => void; validation: ReturnType<typeof validationFor> }) {
  if (section === "passport") return <PassportSection program={program} data={data} update={update} onDataChange={onDataChange} />;
  if (section === "general") return <GeneralSection type={type} data={data} update={update} onDataChange={onDataChange} />;
  if (section === "results") return <ResultsSection type={type} data={data} update={update} />;
  if (section === "plan") return <PlanSection type={type} programId={program.id} data={data} update={update} disciplines={disciplines} onCreateDiscipline={onCreateDiscipline} onOpenDiscipline={onOpenDiscipline} />;
  if (section === "sections") return <SectionProgramsSection type={type} data={data} update={update} disciplines={disciplines} onDisciplineChange={onDisciplineChange} />;
  if (section === "assessment") return <AssessmentSection type={type} data={data} update={update} disciplines={disciplines} />;
  if (section === "conditions") return <ConditionsSection type={type} data={data} update={update} />;
  return <ReviewSection program={program} role={role} validation={validation} onStatusChange={onStatusChange} />;
}

function PassportSection({ program, data, update, onDataChange }: { program: ProgramRecord; data: ProgramData; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void; onDataChange: (data: ProgramData, title?: string) => void }) {
  return (
    <>
      <SectionHeading title="Паспорт программы" description="Титульные сведения будут перенесены в итоговый документ." />
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Наименование программы">
          <Input value={program.title} onChange={(event) => onDataChange(data, event.target.value)} />
        </Field>
        <SystemField label="Институт" value={data.institute} onChange={(value) => update("institute", value)} />
        <Field label="Центр / структурное подразделение">
          <Input value={data.center} onChange={(event) => update("center", event.target.value)} />
        </Field>
        <SystemField label="Руководитель образовательной программы" value={data.manager} onChange={(value) => update("manager", value)} pending />
        {program.type === "DOOP" && (
          <Field label="Авторы программы" hint="Укажите Ф. И. О., должность, учёную степень и подразделение каждого автора с новой строки.">
            <Textarea rows={4} value={data.programAuthors} onChange={(event) => update("programAuthors", event.target.value)} />
          </Field>
        )}
        <Field label="Место составления">
          <Input value={data.city} onChange={(event) => update("city", event.target.value)} />
        </Field>
        <Field label="Год">
          <Input type="number" value={data.year} onChange={(event) => update("year", event.target.value)} />
        </Field>
        <Field label="Трудоёмкость программы, часов" hint={typeMeta[program.type].minHours ? `Минимум: ${typeMeta[program.type].minHours} ч.` : "Укажите общую трудоёмкость программы."}>
          <Input type="number" min={0} value={data.duration} onChange={(event) => update("duration", Number(event.target.value))} />
        </Field>
      </div>
    </>
  );
}

function GeneralSection({ type, data, update, onDataChange }: { type: ProgramType; data: ProgramData; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void; onDataChange: (data: ProgramData, title?: string) => void }) {
  const generated = goalText(data, type);
  const combinedGoal = type === "PK" && data.goalAction === "совершенствование имеющейся и получение новой профессиональной компетенции";
  const setLearningFormat = (value: string) =>
    onDataChange({
      ...data,
      learningFormat: value,
      studyPlans:
        value === "гибридный"
          ? getStudyPlans(data).map((plan) => ({
              ...plan,
              rows: plan.rows.map((row) => ({
                ...row,
                distanceLectures: row.lectures,
                distancePractice: row.practice,
                distanceLabs: row.labs,
              })),
            }))
          : getStudyPlans(data),
    });
  return (
    <>
      <SectionHeading title="Общая характеристика программы" description={type === "DOOP" ? "Для ДООП основным содержательным полем является актуальность программы." : "Цель, требования и основания разработки заполняются в порядке макета."} />
      <div className="grid gap-6">
        {type === "DOOP" && (
          <Field label="Категория слушателей" hint="Для ДООП для взрослых не указывайте детские возрастные категории.">
            <Textarea rows={3} value={data.audience} onChange={(event) => update("audience", event.target.value)} />
          </Field>
        )}
        {type === "DOOP" && (
          <Field label="Актуальность программы" hint="В макете рекомендовано 2–3 предложения.">
            <Textarea rows={4} value={data.actuality} onChange={(event) => update("actuality", event.target.value)} />
          </Field>
        )}
        {type === "PK" && (
          <div className="rounded-2xl border bg-slate-50/70 p-5">
            <h3 className="font-semibold text-[#203759]">Цель реализации программы</h3>
            <p className="mt-1 text-xs text-muted-foreground">Цель формируется системой. Для комбинированного варианта обязательно указываются две разные компетенции.</p>
            <div className="mt-4 grid gap-4">
              <Field label="Тип цели">
                <Select value={data.goalAction} onValueChange={(value) => update("goalAction", value)}>
                  <SelectTrigger className="w-full bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="совершенствование профессиональной компетенции">Совершенствование компетенции</SelectItem>
                    <SelectItem value="получение новой компетенции, необходимой для профессиональной деятельности">Получение новой компетенции</SelectItem>
                    <SelectItem value="совершенствование имеющейся и получение новой профессиональной компетенции">Комбинированная: совершенствование и получение новой компетенции</SelectItem>
                    <SelectItem value="повышение профессионального уровня">Повышение профессионального уровня</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {combinedGoal ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Совершенствуемая компетенция">
                    <Input value={data.goalCompetence} onChange={(event) => update("goalCompetence", event.target.value)} placeholder="Введите первую компетенцию" />
                  </Field>
                  <Field label="Новая компетенция">
                    <Input value={data.goalNewCompetence} onChange={(event) => update("goalNewCompetence", event.target.value)} placeholder="Введите вторую компетенцию" />
                  </Field>
                </div>
              ) : (
                <>
                  <Field label="Компетенция">
                    <Input value={data.goalCompetence} onChange={(event) => update("goalCompetence", event.target.value)} placeholder="Введите содержательную часть компетенции" />
                  </Field>
                  <Field label="Имеющаяся квалификация">
                    <Input value={data.goalQualification} onChange={(event) => update("goalQualification", event.target.value)} />
                  </Field>
                </>
              )}
            </div>
            <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[.1em] text-primary">Текст для программы</div>
              <p className="text-sm leading-relaxed text-[#243858]">{combinedGoal && (!data.goalCompetence.trim() || !data.goalNewCompetence.trim()) ? "Заполните обе компетенции — после этого система соберёт полную формулировку цели." : generated}</p>
            </div>
          </div>
        )}
        {type === "PP" && (
          <div className="rounded-2xl border bg-slate-50/70 p-5">
            <h3 className="font-semibold text-[#203759]">Цель реализации программы</h3>
            <p className="mt-1 text-xs text-muted-foreground">Соберите формулировку по отдельным графам либо вставьте готовый текст.</p>
            <Tabs value={data.goalMode} onValueChange={(value) => update("goalMode", value as ProgramData["goalMode"])} className="mt-4">
              <TabsList>
                <TabsTrigger value="fields">Собрать по графам</TabsTrigger>
                <TabsTrigger value="paste">Вставить готовый текст</TabsTrigger>
              </TabsList>
              <TabsContent value="fields" className="mt-4 grid gap-4">
                <Field label="Целевое действие">
                  <Select value={data.goalAction} onValueChange={(value) => update("goalAction", value)}>
                    <SelectTrigger className="w-full bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="получение компетенции, необходимой для выполнения нового вида профессиональной деятельности">Получение компетенции для нового вида деятельности</SelectItem>
                      <SelectItem value="приобретение новой квалификации">Приобретение новой квалификации</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Компетенция">
                  <Input value={data.goalCompetence} onChange={(event) => update("goalCompetence", event.target.value)} />
                </Field>
                <Field label="Квалификация">
                  <Input value={data.goalQualification} onChange={(event) => update("goalQualification", event.target.value)} />
                </Field>
              </TabsContent>
              <TabsContent value="paste" className="mt-4">
                <Field label="Готовая формулировка">
                  <Textarea rows={5} maxLength={1500} value={data.goalCustomText} onChange={(event) => update("goalCustomText", event.target.value)} />
                </Field>
              </TabsContent>
            </Tabs>
            <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
              <div className="mb-1 text-[11px] font-bold uppercase tracking-[.1em] text-primary">Текст для программы</div>
              <p className="text-sm leading-relaxed text-[#243858]">{generated || "Заполните графы — здесь появится готовая формулировка цели."}</p>
            </div>
          </div>
        )}
        {type === "DOOP" && (
          <>
            <Field label="Задачи программы">
              <Textarea rows={5} value={data.tasks} onChange={(event) => update("tasks", event.target.value)} placeholder="Каждая задача — с новой строки" />
            </Field>
            <Field label="Направленность программы">
              <Select value={data.direction || undefined} onValueChange={(value) => update("direction", value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Выберите одно направление" />
                </SelectTrigger>
                <SelectContent>
                  {["техническая", "естественнонаучная", "физкультурно-спортивная", "художественная", "туристско-краеведческая", "социально-гуманитарная"].map((value) => (
                    <SelectItem key={value} value={value}>
                      {value[0].toUpperCase() + value.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
        {type === "PP" && (
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Новый вид профессиональной деятельности">
              <Textarea value={data.activity} onChange={(event) => update("activity", event.target.value)} />
            </Field>
            <Field label="Присваиваемая квалификация">
              <Input value={data.qualification} onChange={(event) => update("qualification", event.target.value)} />
            </Field>
            <Field label="Трудовые функции">
              <Textarea value={data.laborFunctions} onChange={(event) => update("laborFunctions", event.target.value)} />
            </Field>
            <Field label="Трудовые действия">
              <Textarea value={data.laborActions} onChange={(event) => update("laborActions", event.target.value)} />
            </Field>
            <Field label="Уровень квалификации">
              <Input value={data.qualificationLevel} onChange={(event) => update("qualificationLevel", event.target.value)} placeholder="Например, 6-й уровень квалификации" />
            </Field>
          </div>
        )}
        {type !== "DOOP" && (
          <>
            <Field label="Требования к уровню подготовки поступающего" hint="Базовый текст из макета уже внесён и доступен для редактирования.">
              <Textarea rows={6} value={data.admission} onChange={(event) => update("admission", event.target.value)} />
            </Field>
            <BasisBlock type={type} data={data} update={update} />
          </>
        )}
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Форма обучения">
            <Select value={data.learningForm} onValueChange={(value) => update("learningForm", value as ProgramData["learningForm"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="очная">Очная</SelectItem>
                <SelectItem value="очно-заочная">Очно-заочная</SelectItem>
                <SelectItem value="заочная">Заочная</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Формат обучения">
            <Select value={data.learningFormat} onValueChange={setLearningFormat}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="очный">Очный</SelectItem>
                <SelectItem value="онлайн (синхронный)">Онлайн (синхронный)</SelectItem>
                <SelectItem value="онлайн (асинхронный)">Онлайн (асинхронный)</SelectItem>
                <SelectItem value="смешанный">Смешанный</SelectItem>
                <SelectItem value="гибридный">Гибридный</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </div>
    </>
  );
}

function BasisBlock({ type, data, update }: { type: ProgramType; data: ProgramData; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void }) {
  const source = (title: string, nameKey: "basisProfessionalStandard" | "basisEks" | "basisFgos", detailsKey: "basisProfessionalStandardDetails" | "basisEksDetails" | "basisFgosDetails", example: string, url: string, hint: string) => (
    <div className="rounded-xl border bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="font-semibold text-[#253957]">{title}</h4>
        {type === "PP" && (
          <a className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline underline-offset-2" href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            Открыть справочник
          </a>
        )}
      </div>
      {type === "PP" && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <Field label="Название">
          <Input value={data[nameKey]} onChange={(event) => update(nameKey, event.target.value)} placeholder="Введите только название" />
        </Field>
        <Field label="Входные данные / реквизиты" hint={example}>
          <Input value={data[detailsKey]} onChange={(event) => update(detailsKey, event.target.value)} placeholder="Орган, дата, номер документа" />
        </Field>
      </div>
    </div>
  );
  return (
    <div className="rounded-2xl border p-5">
      <h3 className="font-semibold">Программа разработана на основе</h3>
      <p className="mt-1 text-xs text-muted-foreground">Для каждого основания доступны только два поля: название и входные данные (реквизиты документа).</p>
      <div className="mt-5 grid gap-4">
        {source("Профессиональный стандарт", "basisProfessionalStandard", "basisProfessionalStandardDetails", "Например: приказ Минтруда России от 22.09.2021 № 652н.", "https://classinform.ru/profstandarty.html", "Найдите подходящий стандарт и перенесите полное наименование, номер приказа и дату утверждения.")}
        {source("Квалификационные требования / ЕКС", "basisEks", "basisEksDetails", "Например: приказ Минздравсоцразвития России от 26.08.2010 № 761н.", "https://bizlog.ru/eks/", "Найдите должность или раздел ЕКС и укажите наименование выпуска и реквизиты утверждающего документа.")}
        {source("ФГОС ВО", "basisFgos", "basisFgosDetails", "Укажите орган, дату и номер приказа.", "https://fgosvo.ru/fgosvo/index/24", "Выберите уровень и направление подготовки; укажите шифр, наименование и реквизиты приказа.")}
        <Field label="Обоснование отсутствия основания" hint="Заполняется, если профессиональный стандарт, ЕКС или ФГОС ВО не применяются.">
          <Textarea rows={3} value={data.basisJustification} onChange={(event) => update("basisJustification", event.target.value)} />
        </Field>
      </div>
    </div>
  );
}

function ResultsSection({ type, data, update }: { type: ProgramType; data: ProgramData; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void }) {
  const professionalMinimum = type === "PK" || type === "PP" ? 2 : 1;
  return (
    <>
      <SectionHeading title="Планируемые результаты обучения" description="Компетенции, знания и умения расположены рядом; каждый результат заполняется в отдельном поле." />
      {(type === "PK" || type === "PP") && (
        <Alert className="mb-5 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Обязательный минимум</AlertTitle>
          <AlertDescription>Нужно заполнить не менее двух компетенций и двух знаний. Нарушение считается критической ошибкой и блокирует отправку на проверку и выгрузку.</AlertDescription>
        </Alert>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-3">
        <ListFields label="Профессиональные компетенции" hint={type === "DOOP" ? "Заполняется при наличии компетенций." : "Минимум 2 заполненных поля."} items={data.competenceItems} onChange={(items) => update("competenceItems", items)} addLabel="Добавить компетенцию" minItems={professionalMinimum} />
        <ListFields label="Слушатель должен знать" hint={type === "DOOP" ? "Один результат — одно поле." : "Минимум 2 заполненных поля."} items={data.knowledgeItems} onChange={(items) => update("knowledgeItems", items)} addLabel="Добавить знание" minItems={professionalMinimum} />
        <ListFields label="Слушатель должен уметь" hint="Один результат — одно поле." items={data.skillItems} onChange={(items) => update("skillItems", items)} addLabel="Добавить умение" />
      </div>
    </>
  );
}

function PlanSection({ type, programId, data, update, disciplines, onCreateDiscipline, onOpenDiscipline }: { type: ProgramType; programId: string; data: ProgramData; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void; disciplines: DisciplineRecord[]; onCreateDiscipline: (programId: string, title?: string, hours?: number, seed?: Partial<DisciplineData>) => void; onOpenDiscipline: (record: DisciplineRecord) => void }) {
  const plans = getStudyPlans(data);
  const [activePlanId, setActivePlanId] = useState(plans[0]?.id ?? "");
  const activePlan = plans.find((plan) => plan.id === activePlanId) ?? plans[0];
  if (!activePlan) return null;
  const showDistance = data.learningFormat !== "очный";
  const hybrid = data.learningFormat === "гибридный";
  const showCurrentControl = type === "DOOP";
  const showAttestationKind = type === "DOOP";
  const setPlans = (next: StudyPlan[]) => update("studyPlans", next);
  const replacePlan = (next: StudyPlan) => setPlans(plans.map((plan) => (plan.id === next.id ? next : plan)));
  const addPlan = () => {
    const next = {
      id: crypto.randomUUID(),
      title: `Учебный план ${plans.length + 1}`,
      rows: [],
      finalAssessmentHours: 0,
      finalAssessmentForm: "",
      finalAssessmentKind: "",
      finalAssessmentKindOther: "",
      scheduleRows: [],
    };
    setPlans([...plans, next]);
    setActivePlanId(next.id);
  };
  const addRow = () =>
    replacePlan({
      ...activePlan,
      rows: [
        ...activePlan.rows,
        {
          id: crypto.randomUUID(),
          semester: type === "PP" ? "I" : "",
          title: "",
          hours: 0,
          lectures: 0,
          labs: 0,
          practice: 0,
          distance: 0,
          distanceLectures: 0,
          distancePractice: 0,
          distanceLabs: 0,
          selfStudy: 0,
          currentControl: "Не предусмотрен",
          currentControlOther: "",
          attestation: "",
          attestationKind: "Не выбран",
        },
      ],
    });
  const changeRow = (id: string, key: keyof PlanRow, value: string | number) =>
    replacePlan({
      ...activePlan,
      rows: activePlan.rows.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [key]: value };
        if (hybrid && key === "lectures") next.distanceLectures = Number(value);
        if (hybrid && key === "practice") next.distancePractice = Number(value);
        if (hybrid && key === "labs") next.distanceLabs = Number(value);
        return next;
      }),
    });
  const totals = activePlan.rows.reduce(
    (acc, row) => ({
      lectures: acc.lectures + row.lectures,
      labs: acc.labs + row.labs,
      practice: acc.practice + row.practice,
      distanceLectures: acc.distanceLectures + row.distanceLectures,
      distancePractice: acc.distancePractice + row.distancePractice,
      distanceLabs: acc.distanceLabs + row.distanceLabs,
      selfStudy: acc.selfStudy + row.selfStudy,
      contact: acc.contact + rowContactTotal(row),
      workload: acc.workload + rowWorkload(row),
    }),
    {
      lectures: 0,
      labs: 0,
      practice: 0,
      distanceLectures: 0,
      distancePractice: 0,
      distanceLabs: 0,
      selfStudy: 0,
      contact: 0,
      workload: 0,
    },
  );
  const schedulePeriod = (rowId: string) => activePlan.scheduleRows.find((item) => item.planRowId === rowId)?.period ?? "";
  const setPeriod = (rowId: string, period: string) =>
    replacePlan({
      ...activePlan,
      scheduleRows: [
        ...activePlan.scheduleRows.filter((item) => item.planRowId !== rowId),
        {
          id: activePlan.scheduleRows.find((item) => item.planRowId === rowId)?.id ?? crypto.randomUUID(),
          planRowId: rowId,
          period,
        },
      ],
    });
  return (
    <>
      <SectionHeading title="Учебные планы" description="У программы единые форма, формат и трудоёмкость, но может быть несколько учебных планов с разным распределением контактных часов." />
      <Alert className="mb-5 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertTitle>Минимум два раздела, шаг 0,5 часа</AlertTitle>
        <AlertDescription>Трудоёмкость каждого раздела — не менее 1 часа. В гибридном формате дистанционные часы автоматически повторяют аудиторные и недоступны для ручного редактирования.</AlertDescription>
      </Alert>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {plans.map((plan) => (
          <Button key={plan.id} variant={plan.id === activePlan.id ? "default" : "outline"} onClick={() => setActivePlanId(plan.id)}>
            {plan.title}
          </Button>
        ))}
        <Button variant="ghost" onClick={addPlan}>
          <Plus className="h-4 w-4" /> Добавить план
        </Button>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <Input value={activePlan.title} onChange={(event) => replacePlan({ ...activePlan, title: event.target.value })} aria-label="Название учебного плана" />
        <Badge variant="secondary" className="h-10 px-4">
          Разделов: {activePlan.rows.length}
        </Badge>
        <Badge variant="outline" className="h-10 px-4">
          Итого: {studyPlanTotal(activePlan)} ч.
        </Badge>
      </div>
      <div className="mb-4 flex justify-end">
        <Button onClick={addRow}>
          <Plus className="h-4 w-4" /> Добавить {type === "PP" ? "дисциплину" : "раздел"}
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className="min-w-48">
                Наименование
              </TableHead>
              <TableHead rowSpan={2}>Трудоёмкость</TableHead>
              <TableHead rowSpan={2}>Всего</TableHead>
              <TableHead colSpan={3} className="text-center">
                Очно
              </TableHead>
              {showDistance && (
                <TableHead colSpan={3} className="text-center">
                  Дист.
                </TableHead>
              )}
              <TableHead rowSpan={2}>СРС</TableHead>
              {showCurrentControl && (
                <TableHead rowSpan={2} className="min-w-44">
                  Текущий контроль
                </TableHead>
              )}
              <TableHead colSpan={showAttestationKind ? 2 : 1} className="text-center">
                Промежуточная аттестация
              </TableHead>
              <TableHead rowSpan={2} />
            </TableRow>
            <TableRow>
              <TableHead>Лекции</TableHead>
              <TableHead>Практика</TableHead>
              <TableHead>Лаб.</TableHead>
              {showDistance && (
                <>
                  <TableHead>Лекции</TableHead>
                  <TableHead>Практика</TableHead>
                  <TableHead>Лаб.</TableHead>
                </>
              )}
              {showAttestationKind && <TableHead>Вид</TableHead>}
              <TableHead>Форма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activePlan.rows.map((row) => {
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input value={row.title} onChange={(event) => changeRow(row.id, "title", event.target.value)} placeholder="Наименование" />
                  </TableCell>
                  <TableCell className="font-semibold">{rowWorkload(row)}</TableCell>
                  <TableCell className="font-semibold text-primary">{rowContactTotal(row)}</TableCell>
                  {(["lectures", "practice", "labs"] as const).map((key) => (
                    <TableCell key={key}>
                      <Input className="w-20" type="number" min={0} step={0.5} value={row[key]} onChange={(event) => changeRow(row.id, key, Number(event.target.value))} />
                    </TableCell>
                  ))}
                  {showDistance &&
                    (["distanceLectures", "distancePractice", "distanceLabs"] as const).map((key) => (
                      <TableCell key={key}>
                        <Input className="w-20" type="number" min={0} step={0.5} disabled={hybrid} value={row[key]} onChange={(event) => changeRow(row.id, key, Number(event.target.value))} title={hybrid ? "Синхронизировано с аудиторными часами" : undefined} />
                      </TableCell>
                    ))}
                  <TableCell>
                    <Input className="w-20" type="number" min={0} step={0.5} value={row.selfStudy} onChange={(event) => changeRow(row.id, "selfStudy", Number(event.target.value))} />
                  </TableCell>
                  {showCurrentControl && (
                    <TableCell>
                      <Select value={row.currentControl} onValueChange={(value) => changeRow(row.id, "currentControl", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Не предусмотрен">Не предусмотрен</SelectItem>
                          {currentControlOptions.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {row.currentControl === "Иное" && <Input className="mt-2" value={row.currentControlOther} onChange={(event) => changeRow(row.id, "currentControlOther", event.target.value)} />}
                    </TableCell>
                  )}
                  {showAttestationKind && (
                    <TableCell>
                      <Select value={row.attestationKind} onValueChange={(value) => changeRow(row.id, "attestationKind", value)}>
                        <SelectTrigger className="min-w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {attestationKinds.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  )}
                  <TableCell>
                    <Select value={row.attestation || undefined} onValueChange={(value) => changeRow(row.id, "attestation", value)}>
                      <SelectTrigger className="min-w-40">
                        <SelectValue placeholder="Выберите форму" />
                      </SelectTrigger>
                      <SelectContent>
                        {assessmentOptions.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        replacePlan({
                          ...activePlan,
                          rows: activePlan.rows.filter((item) => item.id !== row.id),
                          scheduleRows: activePlan.scheduleRows.filter((item) => item.planRowId !== row.id),
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {!activePlan.rows.length && (
              <TableRow>
                <TableCell colSpan={14} className="h-28 text-center text-muted-foreground">
                  Добавьте первый раздел учебного плана.
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-slate-50 font-semibold">
              <TableCell>Всего</TableCell>
              <TableCell>{totals.workload}</TableCell>
              <TableCell>{totals.contact}</TableCell>
              <TableCell>{totals.lectures}</TableCell>
              <TableCell>{totals.practice}</TableCell>
              <TableCell>{totals.labs}</TableCell>
              {showDistance && (
                <>
                  <TableCell>{totals.distanceLectures}</TableCell>
                  <TableCell>{totals.distancePractice}</TableCell>
                  <TableCell>{totals.distanceLabs}</TableCell>
                </>
              )}
              <TableCell>{totals.selfStudy}</TableCell>
              {showCurrentControl && <TableCell />}
              {showAttestationKind && <TableCell />}
              <TableCell />
              <TableCell />
            </TableRow>
            <TableRow className="bg-violet-50">
              <TableCell className="font-semibold">Итоговая аттестация</TableCell>
              <TableCell className="font-semibold">{activePlan.finalAssessmentHours}</TableCell>
              <TableCell colSpan={5 + (showDistance ? 3 : 0) + (showCurrentControl ? 1 : 0) + (showAttestationKind ? 1 : 0)} />
              <TableCell>
                <span className="font-medium">{activePlan.finalAssessmentForm || "Не выбрана"}</span>
              </TableCell>
              <TableCell />
            </TableRow>
            <TableRow className="bg-[#102348] font-semibold text-white">
              <TableCell>Итого</TableCell>
              <TableCell>{totals.workload + activePlan.finalAssessmentHours}</TableCell>
              <TableCell>{totals.contact}</TableCell>
              <TableCell>{totals.lectures}</TableCell>
              <TableCell>{totals.practice}</TableCell>
              <TableCell>{totals.labs}</TableCell>
              {showDistance && (
                <>
                  <TableCell>{totals.distanceLectures}</TableCell>
                  <TableCell>{totals.distancePractice}</TableCell>
                  <TableCell>{totals.distanceLabs}</TableCell>
                </>
              )}
              <TableCell>{totals.selfStudy}</TableCell>
              {showCurrentControl && <TableCell />}
              {showAttestationKind && <TableCell />}
              <TableCell />
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <div className="mt-6 rounded-2xl border border-violet-200 bg-violet-50/70 p-5">
        <div>
          <h3 className="font-semibold text-[#253957]">Итоговая аттестация</h3>
          <p className="mt-1 text-xs text-muted-foreground">Вид определяет, что выполняет слушатель, а форма — по какой шкале выставляется результат.</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Field label="Вид итоговой аттестации" fieldKey={`plan.${activePlan.id}.final-kind`}>
            <Select
              value={activePlan.finalAssessmentKind || undefined}
              onValueChange={(value) =>
                replacePlan({
                  ...activePlan,
                  finalAssessmentKind: value,
                  finalAssessmentKindOther: value === "Иное" ? activePlan.finalAssessmentKindOther : "",
                })
              }
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Выберите вид" />
              </SelectTrigger>
              <SelectContent>
                {finalAssessmentKindOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activePlan.finalAssessmentKind === "Иное" && (
              <Input
                className="mt-2 bg-white"
                value={activePlan.finalAssessmentKindOther}
                onChange={(event) =>
                  replacePlan({
                    ...activePlan,
                    finalAssessmentKindOther: event.target.value,
                  })
                }
                placeholder="Укажите свой вид аттестации"
              />
            )}
          </Field>
          <Field label="Форма оценивания" fieldKey={`plan.${activePlan.id}.final-form`} hint="Доступны только зачёт и экзамен.">
            <Select value={activePlan.finalAssessmentForm || undefined} onValueChange={(value) => replacePlan({ ...activePlan, finalAssessmentForm: value })}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Выберите форму" />
              </SelectTrigger>
              <SelectContent>
                {assessmentOptions.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Продолжительность, часов" fieldKey={`plan.${activePlan.id}.final-hours`}>
            <Input
              className="bg-white"
              type="number"
              min={0}
              step={0.5}
              value={activePlan.finalAssessmentHours}
              onChange={(event) =>
                replacePlan({
                  ...activePlan,
                  finalAssessmentHours: Number(event.target.value),
                })
              }
            />
          </Field>
        </div>
      </div>
      <div className="mt-8">
        <h3 className="font-semibold">Календарный учебный график</h3>
        <p className="mt-1 text-xs text-muted-foreground">Наименования разделов синхронизированы с учебным планом; укажите только период проведения. Часы и вид аттестации в график не выводятся.</p>
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Период обучения (дни, недели)</TableHead>
                <TableHead>Наименование раздела (дисциплины)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activePlan.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <Input className="min-w-40" value={schedulePeriod(row.id)} onChange={(event) => setPeriod(row.id, event.target.value)} placeholder="Например, 01–15.10.2026" />
                  </TableCell>
                  <TableCell>{row.title || "Без наименования"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      {plans.length > 1 && (
        <div className="mt-5 flex justify-end">
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              const next = plans.filter((plan) => plan.id !== activePlan.id);
              setPlans(next);
              setActivePlanId(next[0].id);
            }}
          >
            <Trash2 className="h-4 w-4" /> Удалить этот учебный план
          </Button>
        </div>
      )}
    </>
  );
}

function AssessmentSection({ type, data, update, disciplines }: { type: ProgramType; data: ProgramData; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void; disciplines: DisciplineRecord[] }) {
  const plans = getStudyPlans(data);
  const rows = plans.flatMap((plan) => plan.rows);
  const sectionMap = new Map(data.sectionPrograms.map((section) => [section.planRowId, section]));
  const ppDisciplines = disciplines.map((record) => normalizeDisciplineData(record.data));
  const currentForms = Array.from(new Set((type === "PK" ? data.sectionPrograms.map(sectionProgramControl) : type === "PP" ? ppDisciplines.map((item) => item.currentControl) : rows.map(resolvedCurrentControl)).filter((value) => value && value !== "Не предусмотрен")));
  const interimForms = Array.from(new Set(type === "PP" ? ppDisciplines.map((item) => item.interimAssessment).filter(Boolean) : rows.filter((row) => row.attestation).map((row) => `${type === "PK" ? sectionMap.get(row.id)?.attestationKind || "Не выбран" : row.attestationKind} · ${row.attestation}`)));
  const finalForms = Array.from(new Set(plans.map((plan) => plan.finalAssessmentForm).filter(Boolean)));
  const materialLabel = finalForms.some((form) => /экзамен/i.test(form)) ? "Экзаменационные вопросы и билеты" : finalForms.some((form) => /зач[её]т/i.test(form)) ? "Задания к зачёту" : "Оценочные материалы итоговой аттестации";
  return (
    <>
      <SectionHeading title="Оценка качества освоения программы" description={type === "PK" ? "Формы текущего контроля и виды промежуточной аттестации переносятся из рабочих программ разделов." : type === "PP" ? "Формы текущего контроля и виды промежуточной аттестации переносятся из РПД." : "Формы контроля переносятся сюда из учебного плана."} />
      <div className="grid gap-7">
        <div>
          <h3 className="font-semibold">Формы текущего контроля {type === "PK" ? "из РПР" : type === "PP" ? "из РПД" : "из учебного плана"}</h3>
          {currentForms.length ? (
            <div className="mt-3 grid gap-4">
              {currentForms.map((form) => (
                <Field key={form} label={form} hint="Приведите пример вопроса, задания или иной оценочный материал для этой формы.">
                  <Textarea
                    rows={4}
                    value={data.controlMaterials[form] ?? ""}
                    onChange={(event) =>
                      update("controlMaterials", {
                        ...data.controlMaterials,
                        [form]: event.target.value,
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Текущий контроль пока не выбран.</p>
          )}
        </div>
        <div>
          <h3 className="font-semibold">Промежуточная аттестация: вид, форма и материалы</h3>
          {interimForms.length ? (
            <div className="mt-3 grid gap-4">
              {interimForms.map((form) => (
                <Field key={form} label={form} hint="Поле можно редактировать: добавьте пример задания, вопроса или билета.">
                  <Textarea
                    rows={4}
                    value={data.interimMaterials[form] ?? ""}
                    onChange={(event) =>
                      update("interimMaterials", {
                        ...data.interimMaterials,
                        [form]: event.target.value,
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Не предусмотрена</p>
          )}
        </div>
        <div className="rounded-2xl border bg-violet-50/60 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Итоговая аттестация</h3>
              <p className="mt-1 text-xs text-muted-foreground">Вид, форма и часы синхронизированы с каждым учебным планом.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {plans.map((plan) => (
                <Badge key={plan.id} className="bg-violet-100 text-violet-800">
                  {plan.title}: {resolvedFinalAssessmentKind(plan) || "вид не выбран"} · {plan.finalAssessmentForm || "форма не выбрана"} · {plan.finalAssessmentHours} ч.
                </Badge>
              ))}
            </div>
          </div>
          <Field label={materialLabel} hint="Оценочные материалы доступны для редактирования.">
            <Textarea className="mt-4 bg-white" rows={7} value={data.finalAssessmentMaterials} onChange={(event) => update("finalAssessmentMaterials", event.target.value)} />
          </Field>
        </div>
        <div>
          <h3 className="font-semibold">Критерии итоговой аттестации</h3>
          <p className="mt-1 text-xs text-muted-foreground">Критерии можно править. Для зачёта система создаёт поля «зачтено / не зачтено», для экзамена — шкалу 5, 4, 3, 2.</p>
          <div className="mt-3 grid gap-4">
            {finalForms.length ? (
              finalForms.map((form) => (
                <Field key={form} label={form === "Зачёт" ? "Критерии: зачтено / не зачтено" : "Критерии: оценки 5, 4, 3, 2"} hint="Начальный текст сформирован автоматически по выбранной форме и остаётся полностью редактируемым.">
                  <Textarea
                    rows={7}
                    value={data.finalCriteria[form] ?? automaticCriteria(form)}
                    onChange={(event) =>
                      update("finalCriteria", {
                        ...data.finalCriteria,
                        [form]: event.target.value,
                      })
                    }
                  />
                </Field>
              ))
            ) : (
              <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Сначала выберите форму итоговой аттестации в учебном плане.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function PpDisciplinePrograms({ data, disciplines, onChange }: { data: ProgramData; disciplines: DisciplineRecord[]; onChange: (record: DisciplineRecord) => void }) {
  const planRows = getStudyPlans(data).flatMap((plan) => plan.rows.map((row) => ({ planTitle: plan.title, row })));
  const byRow = new Map(disciplines.map((record) => [normalizeDisciplineData(record.data).planRowId, record]));
  const save = <K extends keyof DisciplineData>(record: DisciplineRecord, value: DisciplineData, key: K, next: DisciplineData[K]) =>
    onChange({
      ...record,
      data: JSON.stringify({ ...value, [key]: next }),
      updatedAt: new Date().toISOString(),
    });
  const blankTopic = (): SectionTopicRow => ({
    id: crypto.randomUUID(),
    topic: "",
    lectures: "",
    lectureHours: 0,
    labs: "",
    labHours: 0,
    practice: "",
    practiceHours: 0,
    selfStudy: "",
    selfStudyHours: 0,
  });
  return planRows.length ? (
    <div className="grid gap-7">
      {planRows.map(({ planTitle, row }) => {
        const record = byRow.get(row.id);
        if (!record)
          return (
            <Alert key={row.id} className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{row.title || "Дисциплина без наименования"}</AlertTitle>
              <AlertDescription>РПД создаётся и сохраняется автоматически. Подождите несколько секунд.</AlertDescription>
            </Alert>
          );
        const discipline = normalizeDisciplineData(record.data);
        const rows = discipline.topicRows.length ? discipline.topicRows : [blankTopic()];
        const totals = sectionTopicTotals(rows);
        const matches = totals.lectures === row.lectures && totals.practice === row.practice && totals.labs === row.labs && totals.selfStudy === row.selfStudy;
        const setTopic = (id: string, key: keyof SectionTopicRow, value: string | number) =>
          save(
            record,
            discipline,
            "topicRows",
            rows.map((topic) => (topic.id === id ? { ...topic, [key]: value } : topic)),
          );
        const materialRows = discipline.materialRows.length
          ? discipline.materialRows
          : [
              {
                id: crypto.randomUUID(),
                room: "",
                activity: "",
                equipment: "",
              },
            ];
        return (
          <ReviewCommentScope key={record.id} prefix={`rpd.${record.id}`}>
            <div className="rounded-2xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="secondary">{planTitle}</Badge>
                  <h3 className="mt-2 text-lg font-semibold">{record.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Трудоёмкость: {record.hours} ч. · форма промежуточной аттестации: {row.attestation || "не выбрана"}
                  </p>
                </div>
                <Badge className={matches ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>{matches ? "Часы совпадают" : "Критическая ошибка в часах"}</Badge>
              </div>
              <div className="mt-5 grid gap-5">
                <Field label="Цель освоения дисциплины">
                  <Textarea rows={3} value={discipline.purpose} onChange={(event) => save(record, discipline, "purpose", event.target.value)} />
                </Field>
                <div className="grid items-start gap-4 xl:grid-cols-4">
                  <ListFields label="Компетенции" hint="Минимум 2." items={discipline.competenceItems} minItems={2} addLabel="Добавить" onChange={(items) => save(record, discipline, "competenceItems", items)} />
                  <ListFields label="Знать" hint="Минимум 2." items={discipline.knowledgeItems} minItems={2} addLabel="Добавить" onChange={(items) => save(record, discipline, "knowledgeItems", items)} />
                  <ListFields label="Уметь" hint="Минимум 2." items={discipline.skillItems} minItems={2} addLabel="Добавить" onChange={(items) => save(record, discipline, "skillItems", items)} />
                  <ListFields label="Владеть" hint="Минимум 2." items={discipline.masteryItems} minItems={2} addLabel="Добавить" onChange={(items) => save(record, discipline, "masteryItems", items)} />
                </div>
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">Содержание дисциплины</h4>
                      <p className="text-xs text-muted-foreground">Итоги по видам занятий должны совпадать с учебным планом.</p>
                    </div>
                    <Button variant="outline" onClick={() => save(record, discipline, "topicRows", [...rows, blankTopic()])}>
                      <Plus className="h-4 w-4" />
                      Добавить тему
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border">
                    <Table className="min-w-[900px] table-fixed text-xs">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[20%]">Тема</TableHead>
                          <TableHead>Лекции</TableHead>
                          <TableHead>Практика</TableHead>
                          <TableHead>Лабораторные</TableHead>
                          <TableHead>СРС</TableHead>
                          <TableHead className="w-16">Всего</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((topic, index) => (
                          <TableRow key={topic.id}>
                            <TableCell className="align-top">
                              <div className="flex gap-1">
                                <Textarea rows={2} value={topic.topic} onChange={(event) => setTopic(topic.id, "topic", event.target.value)} placeholder={`Тема ${index + 1}`} />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={rows.length === 1}
                                  onClick={() =>
                                    save(
                                      record,
                                      discipline,
                                      "topicRows",
                                      rows.filter((item) => item.id !== topic.id),
                                    )
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                            {(
                              [
                                ["lectures", "lectureHours", "Содержание лекции"],
                                ["practice", "practiceHours", "Практическое занятие"],
                                ["labs", "labHours", "Лабораторная работа"],
                                ["selfStudy", "selfStudyHours", "Задание СРС"],
                              ] as const
                            ).map(([textKey, hoursKey, placeholder]) => (
                              <TableCell key={textKey} className="align-top">
                                <Textarea rows={2} value={topic[textKey]} onChange={(event) => setTopic(topic.id, textKey, event.target.value)} placeholder={placeholder} />
                                <Input className="mt-1" type="number" min={0} step={0.5} value={topic[hoursKey]} onChange={(event) => setTopic(topic.id, hoursKey, Number(event.target.value))} />
                              </TableCell>
                            ))}
                            <TableCell className="text-center font-semibold">{topic.lectureHours + topic.practiceHours + topic.labHours + topic.selfStudyHours}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-slate-50 font-semibold">
                          <TableCell>Итого</TableCell>
                          <TableCell>{totals.lectures}</TableCell>
                          <TableCell>{totals.practice}</TableCell>
                          <TableCell>{totals.labs}</TableCell>
                          <TableCell>{totals.selfStudy}</TableCell>
                          <TableCell>{totals.lectures + totals.practice + totals.labs + totals.selfStudy}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Текущий контроль">
                    <Textarea rows={3} value={discipline.currentControl} onChange={(event) => save(record, discipline, "currentControl", event.target.value)} />
                  </Field>
                  <Field label="Вид промежуточной аттестации" hint={`Форма «${row.attestation || "не выбрана"}» взята из учебного плана.`}>
                    <Select value={discipline.interimAssessment.split(":")[0] || "Не выбран"} onValueChange={(value) => save(record, discipline, "interimAssessment", `${value}: ${row.attestation}`)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {attestationKinds.map((value) => (
                          <SelectItem key={value} value={value}>
                            {value}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Оценочные материалы">
                  <Textarea rows={4} value={discipline.assessmentMaterials} onChange={(event) => save(record, discipline, "assessmentMaterials", event.target.value)} />
                </Field>
                <Field label="Критерии оценки" hint="Начальный текст сформирован по форме промежуточной аттестации из учебного плана и доступен для редактирования.">
                  <Textarea rows={6} value={discipline.criteria || automaticCriteria(row.attestation)} onChange={(event) => save(record, discipline, "criteria", event.target.value)} />
                </Field>
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="font-semibold">Материально-технические условия</h4>
                    <Button
                      variant="outline"
                      onClick={() =>
                        save(record, discipline, "materialRows", [
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
                      <Plus className="h-4 w-4" />
                      Добавить строку
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
                        {materialRows.map((material) => (
                          <TableRow key={material.id}>
                            {(["room", "activity", "equipment"] as const).map((key) => (
                              <TableCell key={key}>
                                <Textarea
                                  rows={2}
                                  value={material[key]}
                                  onChange={(event) =>
                                    save(
                                      record,
                                      discipline,
                                      "materialRows",
                                      materialRows.map((item) =>
                                        item.id === material.id
                                          ? {
                                              ...item,
                                              [key]: event.target.value,
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                              </TableCell>
                            ))}
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={materialRows.length === 1}
                                onClick={() =>
                                  save(
                                    record,
                                    discipline,
                                    "materialRows",
                                    materialRows.filter((item) => item.id !== material.id),
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
                <ReferencesEditor items={discipline.referenceItems} onChange={(items) => save(record, discipline, "referenceItems", items)} />
                <Field label="Кадровые условия">
                  <Textarea rows={4} value={discipline.staffConditions} onChange={(event) => save(record, discipline, "staffConditions", event.target.value)} />
                </Field>
              </div>
            </div>
          </ReviewCommentScope>
        );
      })}
    </div>
  ) : (
    <Alert>
      <Info className="h-4 w-4" />
      <AlertTitle>Сначала заполните учебный план</AlertTitle>
      <AlertDescription>После добавления дисциплин РПД появятся здесь автоматически.</AlertDescription>
    </Alert>
  );
}

function SectionProgramsSection({ type, data, update, disciplines, onDisciplineChange }: { type: ProgramType; data: ProgramData; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void; disciplines: DisciplineRecord[]; onDisciplineChange: (record: DisciplineRecord) => void }) {
  if (type === "PP")
    return (
      <>
        <SectionHeading title="Рабочие программы дисциплин" description="РПД создаются автоматически по строкам учебного плана, редактируются здесь и сохраняются отдельно в библиотеке для последующего создания программ ПК." />
        <Alert className="mb-5 border-blue-200 bg-blue-50">
          <Info className="h-4 w-4" />
          <AlertTitle>Автоматическое сохранение</AlertTitle>
          <AlertDescription>Кнопка создания не требуется. Наименование, часы и форма промежуточной аттестации синхронизируются с учебным планом. Для каждой РПД обязательны минимум 2 компетенции, 2 знания, 2 умения и 2 владения.</AlertDescription>
        </Alert>
        <PpDisciplinePrograms data={data} disciplines={disciplines} onChange={onDisciplineChange} />
      </>
    );
  const planRows = getStudyPlans(data).flatMap((plan) => plan.rows.map((row) => ({ planTitle: plan.title, row })));
  const blankTopic = (id = crypto.randomUUID()): SectionTopicRow => ({
    id,
    topic: "",
    lectures: "",
    lectureHours: 0,
    labs: "",
    labHours: 0,
    practice: "",
    practiceHours: 0,
    selfStudy: "",
    selfStudyHours: 0,
  });
  const storedSection = (planRowId: string) =>
    data.sectionPrograms.find((item) => item.planRowId === planRowId) ?? {
      planRowId,
      rows: [blankTopic(`${planRowId}-first`)],
      currentControl: "Не предусмотрен",
      currentControlOther: "",
      attestationKind: "Не выбран",
    };
  const setSectionProgram = (next: ReturnType<typeof storedSection>) => update("sectionPrograms", [...data.sectionPrograms.filter((item) => item.planRowId !== next.planRowId), next]);
  const headers = ["Тема", "Лекции", "Практика", "Лаб.", "СРС", "Всего"];
  return (
    <>
      <SectionHeading title="Рабочие программы разделов" description="Для каждого раздела заполните темы и часы. Система сравнивает итог по каждому виду работы с учебным планом." />
      <Alert className="mb-5 border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertTitle>Как заполнять таблицу</AlertTitle>
        <AlertDescription>В текстовом поле укажите содержание занятия, ниже — часы с шагом 0,5. Если вид работы не предусмотрен, оставьте 0. Текущий контроль и вид промежуточной аттестации для ПК задаются здесь.</AlertDescription>
      </Alert>
      {planRows.length ? (
        <div className="grid gap-7">
          {planRows.map(({ planTitle, row }) => {
            const sectionProgram = storedSection(row.id);
            const rows = sectionProgram.rows.length ? sectionProgram.rows : [blankTopic(`${row.id}-first`)];
            const setCell = (id: string, key: keyof SectionTopicRow, value: string | number) =>
              setSectionProgram({
                ...sectionProgram,
                rows: rows.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
              });
            const totals = sectionTopicTotals(rows);
            const totalHours = totals.lectures + totals.labs + totals.practice + totals.selfStudy;
            const matches = totals.lectures === row.lectures && totals.labs === row.labs && totals.practice === row.practice && totals.selfStudy === row.selfStudy;
            const activityCell = (topic: SectionTopicRow, textKey: "lectures" | "labs" | "practice" | "selfStudy", hoursKey: "lectureHours" | "labHours" | "practiceHours" | "selfStudyHours", placeholder: string) => (
              <TableCell className="p-2 align-top">
                <Textarea rows={2} className="min-h-16 resize-y text-xs leading-snug" value={topic[textKey]} onChange={(event) => setCell(topic.id, textKey, event.target.value)} placeholder={placeholder} />
                <div className="mt-1 flex items-center gap-1">
                  <Input className="h-8 min-w-0 text-xs" type="number" min={0} step={0.5} value={topic[hoursKey]} onChange={(event) => setCell(topic.id, hoursKey, Number(event.target.value))} aria-label="Количество часов" />
                  <span className="text-xs text-muted-foreground">ч.</span>
                </div>
              </TableCell>
            );
            return (
              <div key={row.id} className="rounded-2xl border p-5">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge variant="secondary">{planTitle}</Badge>
                    <h3 className="mt-2 font-semibold">{row.title || "Раздел без наименования"}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      По учебному плану: лекции {row.lectures}; практика {row.practice}; лабораторные {row.labs}; СРС {row.selfStudy}; всего {rowWorkload(row)} ч.
                    </p>
                  </div>
                  <Badge className={matches ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}>{matches ? "Часы совпадают" : "Есть расхождение"}</Badge>
                </div>
                {type === "PK" && (
                  <div className="mb-5 grid gap-4 rounded-xl bg-slate-50 p-4 md:grid-cols-2">
                    <Field label="Текущий контроль" fieldKey={`section.${row.id}.current-control`}>
                      <Select
                        value={sectionProgram.currentControl}
                        onValueChange={(value) =>
                          setSectionProgram({
                            ...sectionProgram,
                            currentControl: value,
                          })
                        }
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Не предусмотрен">Не предусмотрен</SelectItem>
                          {currentControlOptions.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {sectionProgram.currentControl === "Иное" && (
                        <Input
                          className="mt-2 bg-white"
                          value={sectionProgram.currentControlOther}
                          onChange={(event) =>
                            setSectionProgram({
                              ...sectionProgram,
                              currentControlOther: event.target.value,
                            })
                          }
                          placeholder="Укажите форму контроля"
                        />
                      )}
                    </Field>
                    <Field label="Вид промежуточной аттестации" fieldKey={`section.${row.id}.attestation-kind`} hint={row.attestation ? `Форма из учебного плана: ${row.attestation}.` : "Сначала выберите форму аттестации в учебном плане."}>
                      <Select
                        value={sectionProgram.attestationKind}
                        onValueChange={(value) =>
                          setSectionProgram({
                            ...sectionProgram,
                            attestationKind: value,
                          })
                        }
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {attestationKinds.map((value) => (
                            <SelectItem key={value} value={value}>
                              {value}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                )}
                <div className="overflow-x-auto rounded-xl border">
                  <Table className="min-w-[760px] table-fixed text-xs">
                    <TableHeader>
                      <TableRow>
                        {headers.map((header, index) => (
                          <TableHead key={header} className={`h-10 px-2 align-middle ${index === 0 ? "w-[22%]" : index === 5 ? "w-[8%] text-center" : "w-[17.5%]"}`}>
                            {header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((topic, index) => {
                        const topicTotal = topic.lectureHours + topic.labHours + topic.practiceHours + topic.selfStudyHours;
                        return (
                          <TableRow key={topic.id}>
                            <TableCell className="p-2 align-top">
                              <div className="mb-1 flex items-center justify-between gap-1">
                                <span className="font-bold text-primary">Тема {index + 1}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  disabled={rows.length === 1}
                                  onClick={() =>
                                    setSectionProgram({
                                      ...sectionProgram,
                                      rows: rows.filter((item) => item.id !== topic.id),
                                    })
                                  }
                                  aria-label="Удалить тему"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <Textarea rows={2} className="min-h-16 resize-y text-xs leading-snug" value={topic.topic} onChange={(event) => setCell(topic.id, "topic", event.target.value)} placeholder="Наименование темы" />
                            </TableCell>
                            {activityCell(topic, "lectures", "lectureHours", "Содержание")}
                            {activityCell(topic, "practice", "practiceHours", "Практическое занятие")}
                            {activityCell(topic, "labs", "labHours", "Лабораторная работа")}
                            {activityCell(topic, "selfStudy", "selfStudyHours", "Задание СРС")}
                            <TableCell className="p-2 text-center align-middle text-sm font-semibold">{topicTotal} ч.</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow className="bg-slate-50 font-semibold">
                        <TableCell className="px-2">Итого</TableCell>
                        <TableCell className="px-2">{totals.lectures} ч.</TableCell>
                        <TableCell className="px-2">{totals.practice} ч.</TableCell>
                        <TableCell className="px-2">{totals.labs} ч.</TableCell>
                        <TableCell className="px-2">{totals.selfStudy} ч.</TableCell>
                        <TableCell className="px-2 text-center">{totalHours} ч.</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setSectionProgram({
                        ...sectionProgram,
                        rows: [...rows, blankTopic()],
                      })
                    }
                  >
                    <Plus className="h-4 w-4" /> Добавить тему
                  </Button>
                  {!matches && <span className="text-sm font-medium text-red-700">Исправьте часы: расхождение блокирует выгрузку.</span>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Сначала заполните учебный план</AlertTitle>
          <AlertDescription>После добавления разделов здесь автоматически появятся отдельные рабочие программы.</AlertDescription>
        </Alert>
      )}
    </>
  );
}

function ConditionsSection({ type, data, update }: { type: ProgramType; data: ProgramData; update: <K extends keyof ProgramData>(key: K, value: ProgramData[K]) => void }) {
  const showDigital = data.learningFormat !== "очный";
  const digitalComplete = data.digitalRows.some((row) => row.resource.trim() && row.activity.trim() && row.equipment.trim());
  return (
    <>
      <SectionHeading title="Организационно-педагогические условия" description="Материально-технические условия и электронная среда заполняются в таблицах, соответствующих макету." />
      <div className="grid gap-8">
        <DynamicConditionsTable title="Материально-технические условия" headers={["Специализированное учебное помещение", "Вид занятий", "Оборудование и программное обеспечение"]} rows={data.materialRows} onChange={(rows) => update("materialRows", rows)} kind="material" />
        <ReferencesEditor items={data.referenceItems} onChange={(items) => update("referenceItems", items)} />
        <Field label="Кадровые условия" hint="Текст макета внесён автоматически и остаётся доступным для уточнения.">
          <Textarea rows={6} value={data.staffConditions} onChange={(event) => update("staffConditions", event.target.value)} />
        </Field>
        {showDigital ? (
          <div>
            {!digitalComplete && type === "PK" && (
              <Alert className="mb-4 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Критическая ошибка</AlertTitle>
                <AlertDescription>Для выбранного формата заполните хотя бы одну полную строку: электронный ресурс, вид занятий и используемое оборудование или ПО.</AlertDescription>
              </Alert>
            )}
            <DynamicConditionsTable title="Условия функционирования электронной информационно-образовательной среды" headers={["Электронный информационный ресурс", "Вид занятий", "Оборудование и программное обеспечение"]} rows={data.digitalRows} onChange={(rows) => update("digitalRows", rows)} kind="digital" />
          </div>
        ) : (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Для очного формата электронные ресурсы необязательны</AlertTitle>
            <AlertDescription>Раздел появится при выборе онлайн-, смешанного или гибридного формата обучения.</AlertDescription>
          </Alert>
        )}
        {type === "DOOP" && (
          <Field label="Средства адаптации для обучающихся с инвалидностью и ОВЗ">
            <Textarea rows={6} value={data.accessibility} onChange={(event) => update("accessibility", event.target.value)} />
          </Field>
        )}
      </div>
    </>
  );
}

function DynamicConditionsTable({ title, headers, rows, onChange, kind }: { title: string; headers: string[]; rows: MaterialRow[] | DigitalRow[]; onChange: (rows: never) => void; kind: "material" | "digital" }) {
  const values = rows.length
    ? rows
    : kind === "material"
      ? [{ id: crypto.randomUUID(), room: "", activity: "", equipment: "" }]
      : [
          {
            id: crypto.randomUUID(),
            resource: "",
            activity: "",
            equipment: "",
          },
        ];
  const setValue = (index: number, key: string, value: string) => onChange(values.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: value } : row)) as never);
  const add = () =>
    onChange([
      ...values,
      kind === "material"
        ? { id: crypto.randomUUID(), room: "", activity: "", equipment: "" }
        : {
            id: crypto.randomUUID(),
            resource: "",
            activity: "",
            equipment: "",
          },
    ] as never);
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-semibold">{title}</h3>
        <Button type="button" variant="outline" onClick={add}>
          <Plus className="h-4 w-4" /> Добавить строку
        </Button>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              {headers.map((header) => (
                <TableHead key={header} className="min-w-48">
                  {header}
                </TableHead>
              ))}
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {values.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Textarea rows={2} value={kind === "material" ? (row as MaterialRow).room : (row as DigitalRow).resource} onChange={(event) => setValue(index, kind === "material" ? "room" : "resource", event.target.value)} />
                </TableCell>
                <TableCell>
                  <Textarea rows={2} value={row.activity} onChange={(event) => setValue(index, "activity", event.target.value)} />
                </TableCell>
                <TableCell>
                  <Textarea rows={2} value={row.equipment} onChange={(event) => setValue(index, "equipment", event.target.value)} />
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" disabled={values.length === 1} onClick={() => onChange(values.filter((_, rowIndex) => rowIndex !== index) as never)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function ReferencesEditor({ items, onChange }: { items: ReferenceItem[]; onChange: (items: ReferenceItem[]) => void }) {
  const values = items.length >= 2 ? items : [...items, ...Array.from({ length: 2 - items.length }, () => emptyReferenceItem())];
  const setItem = (id: string, patch: Partial<ReferenceItem>) => onChange(values.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const currentYear = new Date().getFullYear();
  const years = values.map((item) => Number(item.year)).filter((year) => Number.isInteger(year) && year > 0 && year <= currentYear);
  const recent = years.filter((year) => year >= currentYear - 4).length;
  const recentShare = years.length ? Math.round((recent / years.length) * 100) : 0;
  const completed = values.filter((item) => item.title.trim() && item.year.trim()).length;
  const directCount = values.filter((item) => item.title.trim() && item.kind !== "electronic").length;
  const electronicCount = values.filter((item) => item.title.trim() && item.kind === "electronic").length;
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Список литературы и электронных ресурсов</h3>
          <p className="mt-1 text-xs text-muted-foreground">Заполните отдельные реквизиты — в DOCX система автоматически соберёт готовые описания по ГОСТ Р 7.0.100–2018 и разделит печатные и электронные источники.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Литература: {directCount}</Badge>
          <Badge variant="outline">Электронные: {electronicCount}</Badge>
          <Badge className={years.length && recentShare >= 50 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{years.length ? `За последние 5 лет: ${recentShare}%` : "Годы не указаны"}</Badge>
        </div>
      </div>
      <Alert className={`mt-3 ${completed >= 2 ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}`}>
        {completed >= 2 ? <Info className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <AlertTitle>{completed >= 2 ? "Автоматическая проверка" : "Критическая ошибка"}</AlertTitle>
        <AlertDescription>Нужно не менее двух источников с корректным годом выпуска. Для электронного ресурса обязательна полная ссылка. Система отдельно проверяет, чтобы не менее 50% литературы было издано за последние пять лет.</AlertDescription>
      </Alert>
      <div className="mt-4 grid gap-5">
        {values.map((item, index) => {
          const preview = formatReference(item);
          const validYear = /^\d{4}$/.test(item.year) && Number(item.year) <= currentYear;
          return (
            <ReviewCommentScope key={item.id} prefix={`reference.${item.id}`}>
              <div className="rounded-2xl border p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e8f0ff] text-xs font-bold text-primary">{index + 1}</span>
                    <h4 className="font-semibold">Источник</h4>
                    {item.year && (
                      <Badge variant="outline" className={validYear ? "text-emerald-700" : "border-red-300 text-red-700"}>
                        {validYear ? item.year : "Проверьте год"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={item.kind}
                      onValueChange={(value) =>
                        setItem(item.id, {
                          kind: value as ReferenceItem["kind"],
                        })
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="book">Книга / пособие</SelectItem>
                        <SelectItem value="article">Статья</SelectItem>
                        <SelectItem value="electronic">Электронный ресурс</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" disabled={values.length <= 2} onClick={() => onChange(values.filter((value) => value.id !== item.id))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label={item.kind === "electronic" ? "Автор(ы), если указаны" : "Автор(ы)"} hint="Нескольких авторов разделяйте точкой с запятой.">
                    <Input value={item.authors} onChange={(event) => setItem(item.id, { authors: event.target.value })} placeholder="Иванов, И. И.; Петров, П. П." />
                  </Field>
                  <Field label="Название">
                    <Input
                      value={item.title}
                      onChange={(event) =>
                        setItem(item.id, {
                          title: event.target.value,
                          value: "",
                        })
                      }
                      placeholder="Название источника"
                    />
                  </Field>
                  <Field label="Сведения, относящиеся к заглавию" hint="Например: учебное пособие, монография, официальный сайт.">
                    <Input value={item.subtitle} onChange={(event) => setItem(item.id, { subtitle: event.target.value })} />
                  </Field>
                  {item.kind === "book" && (
                    <>
                      <Field label="Место издания">
                        <Input value={item.city} onChange={(event) => setItem(item.id, { city: event.target.value })} placeholder="Казань" />
                      </Field>
                      <Field label="Издательство">
                        <Input value={item.publisher} onChange={(event) => setItem(item.id, { publisher: event.target.value })} placeholder="Издательство КФУ" />
                      </Field>
                      <Field label="Год выпуска">
                        <Input type="number" min={1000} max={currentYear} value={item.year} onChange={(event) => setItem(item.id, { year: event.target.value })} />
                      </Field>
                      <Field label="Количество страниц">
                        <Input type="number" min={1} value={item.pages} onChange={(event) => setItem(item.id, { pages: event.target.value })} />
                      </Field>
                      <Field label="ISBN, если присвоен">
                        <Input value={item.isbn} onChange={(event) => setItem(item.id, { isbn: event.target.value })} placeholder="978-5-..." />
                      </Field>
                    </>
                  )}
                  {item.kind === "article" && (
                    <>
                      <Field label="Название журнала / сборника">
                        <Input value={item.journal} onChange={(event) => setItem(item.id, { journal: event.target.value })} />
                      </Field>
                      <Field label="Год выпуска">
                        <Input type="number" min={1000} max={currentYear} value={item.year} onChange={(event) => setItem(item.id, { year: event.target.value })} />
                      </Field>
                      <Field label="Номер выпуска">
                        <Input value={item.issue} onChange={(event) => setItem(item.id, { issue: event.target.value })} placeholder="3" />
                      </Field>
                      <Field label="Страницы статьи">
                        <Input value={item.pageRange} onChange={(event) => setItem(item.id, { pageRange: event.target.value })} placeholder="25–38" />
                      </Field>
                    </>
                  )}
                  {item.kind === "electronic" && (
                    <>
                      <Field label="Ответственная организация">
                        <Input
                          value={item.organization}
                          onChange={(event) =>
                            setItem(item.id, {
                              organization: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Место публикации">
                        <Input value={item.city} onChange={(event) => setItem(item.id, { city: event.target.value })} placeholder="Москва" />
                      </Field>
                      <Field label="Издатель / владелец ресурса">
                        <Input value={item.publisher} onChange={(event) => setItem(item.id, { publisher: event.target.value })} />
                      </Field>
                      <Field label="Год публикации">
                        <Input type="number" min={1000} max={currentYear} value={item.year} onChange={(event) => setItem(item.id, { year: event.target.value })} />
                      </Field>
                      <Field label="URL" hint="Обязательно для электронного источника. Укажите полный адрес, начиная с https://.">
                        <Input type="url" required value={item.url} onChange={(event) => setItem(item.id, { url: event.target.value })} placeholder="https://..." />
                      </Field>
                      <Field label="Дата обращения">
                        <Input type="date" value={item.accessDate} onChange={(event) => setItem(item.id, { accessDate: event.target.value })} />
                      </Field>
                    </>
                  )}
                </div>
                <div className="mt-4 rounded-xl border bg-slate-50 p-4">
                  <div className="text-[11px] font-bold uppercase tracking-[.1em] text-primary">Автоматическое описание</div>
                  <p className="mt-1 text-sm leading-relaxed text-[#243858]">{preview || "Заполните название и реквизиты источника."}</p>
                  {item.kind === "electronic" && /^https?:\/\//i.test(item.url) && (
                    <a className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-2" href={item.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Открыть электронный источник
                    </a>
                  )}
                </div>
              </div>
            </ReviewCommentScope>
          );
        })}
        <Button type="button" variant="outline" className="w-fit" onClick={() => onChange([...values, emptyReferenceItem()])}>
          <Plus className="h-4 w-4" /> Добавить источник
        </Button>
      </div>
    </div>
  );
}

function ReviewSection({ program, role, validation, onStatusChange }: { program: ProgramRecord; role: UserRole; validation: ReturnType<typeof validationFor>; onStatusChange: (status: ProgramRecord["status"], reviewComment?: string) => void }) {
  const [reviewComment, setReviewComment] = useState(program.reviewComment ?? "");
  const fieldCommentCount = Object.values(parseFieldNotes(program.fieldComments)).filter((note) => note.text?.trim()).length;
  const normalizedStatus = program.status === "ready" ? "approved" : program.status;
  const labels = {
    draft: "Черновик",
    review: "На проверке",
    approved: "Согласована",
    revision: "На доработке",
  } as const;
  const canExport = role !== "author" || normalizedStatus === "approved";
  return (
    <>
      <SectionHeading title="Проверка, согласование и выгрузка" description="Статусы программы соответствуют ролевой модели: автор готовит, проверяющий принимает решение, администратор управляет доступом и справочниками." />
      <div className="grid gap-3">
        {validation.issues.map((issue, index) => (
          <Alert key={index} className={issue.tone === "error" ? "border-red-200 bg-red-50" : issue.tone === "warning" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
            {issue.tone === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{issue.tone === "error" ? "Требуется исправить" : issue.tone === "warning" ? "Проверьте" : "Проверка пройдена"}</AlertTitle>
            <AlertDescription>{issue.text}</AlertDescription>
          </Alert>
        ))}
      </div>
      {normalizedStatus === "revision" && program.reviewComment && (
        <Alert className="mt-7 border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Замечания проверяющего</AlertTitle>
          <AlertDescription className="whitespace-pre-wrap">{program.reviewComment}</AlertDescription>
        </Alert>
      )}
      <div className="mt-7 rounded-2xl border p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Маршрут согласования</h3>
            <p className="mt-1 text-sm text-muted-foreground">Черновик → на проверке → согласована или отправлена на доработку.</p>
          </div>
          <Badge>{labels[normalizedStatus]}</Badge>
        </div>
        {(role === "reviewer" || role === "admin") && normalizedStatus === "review" && (
          <div className="mt-5">
            <Field label="Общее замечание проверяющего" reviewable={false} hint={`Можно оставить общий комментарий или использовать комментарии возле конкретных полей. Комментариев к полям: ${fieldCommentCount}.`}>
              <Textarea rows={5} value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Например: уточните формулировку цели и приведите часы учебного плана в соответствие с трудоёмкостью." />
            </Field>
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {(role === "author" || role === "admin") && normalizedStatus !== "approved" && (
            <Button disabled={validation.hasCritical} title={validation.hasCritical ? "Исправьте критические ошибки" : undefined} onClick={() => onStatusChange("review")}>
              {normalizedStatus === "review" ? "Повторно отправить на проверку" : "Отправить на проверку"}
            </Button>
          )}
          {(role === "reviewer" || role === "admin") && normalizedStatus === "review" && (
            <>
              <Button onClick={() => onStatusChange("approved")}>Согласовать</Button>
              <Button variant="outline" disabled={!reviewComment.trim() && fieldCommentCount === 0} onClick={() => onStatusChange("revision", reviewComment)}>
                Вернуть на доработку
              </Button>
            </>
          )}
          {normalizedStatus === "approved" && <span className="text-sm text-emerald-700">Согласованная версия доступна в кабинете автора и для выгрузки.</span>}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{validation.hasCritical ? "Отправка на проверку заблокирована до исправления всех критических ошибок." : "Автор может повторно отправить изменённую программу на проверку, пока проверяющий ещё не принял решение. Проверяющий пишет замечания рядом с нужными полями и возвращает программу автору либо согласовывает её."}</p>
      </div>
      <div className="mt-7 rounded-2xl bg-[#102348] p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div>
            <h3 className="text-lg font-semibold">Полностью редактируемый OOXML DOCX</h3>
            <p className="mt-1 max-w-xl text-sm text-blue-100/70">A4, книжная ориентация; поля 20/10/20/20 мм; Times New Roman 12 pt; нумерация страниц со второй страницы.</p>
            {!canExport ? <p className="mt-2 text-sm font-semibold text-amber-300">Автор сможет выгрузить документ после согласования программы.</p> : validation.hasCritical && <p className="mt-2 text-sm font-semibold text-amber-300">Выгрузка станет доступна после исправления всех критических ошибок.</p>}
          </div>
          {!canExport ? (
            <Button disabled size="lg">
              <Download className="h-4 w-4" /> После согласования
            </Button>
          ) : validation.hasCritical ? (
            <Button disabled size="lg">
              <Download className="h-4 w-4" /> Выгрузка недоступна
            </Button>
          ) : (
            <Button asChild size="lg" className="bg-white text-[#123873] hover:bg-blue-50">
              <a href={`/api/export/${program.id}`}>
                <Download className="h-4 w-4" /> Выгрузить DOCX
              </a>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
