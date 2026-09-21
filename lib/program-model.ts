export type ProgramType = "DOOP" | "PK" | "PP";

export type PlanRow = {
  id: string;
  semester: string;
  title: string;
  hours: number;
  lectures: number;
  labs: number;
  practice: number;
  distance: number;
  distanceLectures: number;
  distancePractice: number;
  distanceLabs: number;
  selfStudy: number;
  currentControl: string;
  currentControlOther: string;
  attestation: string;
  attestationKind: string;
};

export type ScheduleRow = { id: string; planRowId: string; period: string };
export type StudyPlan = {
  id: string;
  title: string;
  rows: PlanRow[];
  finalAssessmentHours: number;
  finalAssessmentForm: string;
  finalAssessmentKind: string;
  finalAssessmentKindOther: string;
  scheduleRows: ScheduleRow[];
};

export const finalAssessmentKindOptions = ["Письменная работа", "Устный ответ", "Тестирование", "Практическое задание", "Защита итоговой работы", "Комплексная работа", "Иное"] as const;

export type MaterialRow = {
  id: string;
  room: string;
  activity: string;
  equipment: string;
};
export type DigitalRow = {
  id: string;
  resource: string;
  activity: string;
  equipment: string;
};
export type ReferenceKind = "book" | "article" | "electronic";
export type ReferenceItem = {
  id: string;
  kind: ReferenceKind;
  authors: string;
  title: string;
  subtitle: string;
  city: string;
  publisher: string;
  year: string;
  pages: string;
  isbn: string;
  journal: string;
  issue: string;
  pageRange: string;
  url: string;
  accessDate: string;
  organization: string;
  value: string;
};
export type SectionTopicRow = {
  id: string;
  topic: string;
  lectures: string;
  lectureHours: number;
  labs: string;
  labHours: number;
  practice: string;
  practiceHours: number;
  selfStudy: string;
  selfStudyHours: number;
};
export type SectionProgram = {
  planRowId: string;
  rows: SectionTopicRow[];
  currentControl: string;
  currentControlOther: string;
  attestationKind: string;
};

export type ProgramData = {
  institute: string;
  center: string;
  manager: string;
  programAuthors: string;
  city: string;
  year: string;
  duration: number;
  audience: string;
  actuality: string;
  purpose: string;
  goalMode: "fields" | "paste";
  goalAction: string;
  goalCompetence: string;
  goalNewCompetence: string;
  goalQualification: string;
  goalCustomText: string;
  tasks: string;
  direction: string;
  activity: string;
  laborFunctions: string;
  laborActions: string;
  qualification: string;
  qualificationLevel: string;
  admission: string;
  basis: string;
  basisProfessionalStandard: string;
  basisProfessionalStandardDetails: string;
  basisEks: string;
  basisEksDetails: string;
  basisFgos: string;
  basisFgosDetails: string;
  basisJustification: string;
  learningForm: "очная" | "очно-заочная" | "заочная";
  learningFormat: string;
  competences: string;
  knowledge: string;
  skills: string;
  competenceCriteria: string;
  competenceItems: string[];
  knowledgeItems: string[];
  skillItems: string[];
  plan: PlanRow[];
  studyPlans: StudyPlan[];
  finalAssessmentHours: number;
  finalAssessmentForm: string;
  finalAssessmentKind: string;
  finalAssessmentKindOther: string;
  schedule: string;
  assessmentForms: string;
  assessmentMaterials: string;
  controlMaterials: Record<string, string>;
  interimMaterials: Record<string, string>;
  finalAttestation: string;
  finalAssessmentMaterials: string;
  assessmentCriteria: string;
  finalCriteria: Record<string, string>;
  materialConditions: string;
  materialRows: MaterialRow[];
  references: string;
  referenceItems: ReferenceItem[];
  sectionPrograms: SectionProgram[];
  staffConditions: string;
  digitalEnvironment: string;
  digitalRows: DigitalRow[];
  accessibility: string;
};

export type ProgramRecord = {
  id: string;
  type: ProgramType;
  title: string;
  status: "draft" | "review" | "approved" | "revision" | "ready";
  progress: number;
  data: string;
  reviewComment: string;
  fieldComments: string;
  createdAt: string;
  updatedAt: string;
};

export type DisciplineData = {
  planRowId: string;
  purpose: string;
  competences: string;
  knowledge: string;
  skills: string;
  topics: string;
  currentControl: string;
  interimAssessment: string;
  assessmentMaterials: string;
  criteria: string;
  materialConditions: string;
  competenceItems: string[];
  knowledgeItems: string[];
  skillItems: string[];
  masteryItems: string[];
  topicRows: SectionTopicRow[];
  materialRows: MaterialRow[];
  references: string;
  referenceItems: ReferenceItem[];
  staffConditions: string;
  digitalEnvironment: string;
  digitalRows: DigitalRow[];
};

export type DisciplineRecord = {
  id: string;
  programId: string;
  title: string;
  hours: number;
  sortOrder: number;
  data: string;
  createdAt: string;
  updatedAt: string;
};

export const typeMeta: Record<ProgramType, { short: string; name: string; documentTitle: string; minHours: number }> = {
  DOOP: {
    short: "ДООП",
    name: "Дополнительная общеобразовательная общеразвивающая программа",
    documentTitle: "ДООП для взрослых",
    minHours: 0,
  },
  PK: {
    short: "ПК",
    name: "Дополнительная профессиональная программа повышения квалификации",
    documentTitle: "Программа повышения квалификации",
    minHours: 16,
  },
  PP: {
    short: "ПП",
    name: "Дополнительная профессиональная программа профессиональной переподготовки",
    documentTitle: "Программа профессиональной переподготовки",
    minHours: 250,
  },
};

export function emptyReferenceItem(id = crypto.randomUUID()): ReferenceItem {
  return {
    id,
    kind: "book",
    authors: "",
    title: "",
    subtitle: "",
    city: "",
    publisher: "",
    year: "",
    pages: "",
    isbn: "",
    journal: "",
    issue: "",
    pageRange: "",
    url: "",
    accessDate: "",
    organization: "",
    value: "",
  };
}

function russianDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : value;
}

export function formatReference(item: ReferenceItem) {
  const title = item.title.trim();
  if (!title) return item.value.trim();
  const authors = item.authors
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean)
    .join(", ");
  const firstAuthor =
    item.authors
      .split(";")
      .map((value) => value.trim())
      .find(Boolean) ?? "";
  const responsibility = authors ? ` / ${authors}` : "";
  const subtitle = item.subtitle.trim() ? ` : ${item.subtitle.trim()}` : "";
  if (item.kind === "article") {
    const source = item.journal.trim() ? ` // ${item.journal.trim()}` : "";
    const segments = [`${firstAuthor ? `${firstAuthor} ` : ""}${title}${subtitle}${responsibility}${source}`, item.year.trim(), item.issue.trim() ? `№ ${item.issue.trim()}` : "", item.pageRange.trim() ? `С. ${item.pageRange.trim()}` : "", "Текст : непосредственный"].filter(Boolean);
    return `${segments.join(". – ")}.`;
  }
  if (item.kind === "electronic") {
    const publication = [item.city.trim(), item.publisher.trim()].filter(Boolean).join(" : ");
    const publicationYear = [publication, item.year.trim()].filter(Boolean).join(", ");
    const segments = [`${title}${subtitle} : [сайт]${item.organization.trim() ? ` / ${item.organization.trim()}` : responsibility}`, publicationYear, item.url.trim() ? `URL: ${item.url.trim()}${item.accessDate.trim() ? ` (дата обращения: ${russianDate(item.accessDate.trim())})` : ""}` : "", "Текст : электронный"].filter(Boolean);
    return `${segments.join(". – ")}.`;
  }
  const publication = [item.city.trim(), item.publisher.trim()].filter(Boolean).join(" : ");
  const publicationYear = [publication, item.year.trim()].filter(Boolean).join(", ");
  const segments = [`${firstAuthor ? `${firstAuthor} ` : ""}${title}${subtitle}${responsibility}`, publicationYear, item.pages.trim() ? `${item.pages.trim()} с` : "", item.isbn.trim() ? `ISBN ${item.isbn.trim()}` : "", "Текст : непосредственный"].filter(Boolean);
  return `${segments.join(". – ")}.`;
}

const admissionTemplate = "К освоению дополнительных профессиональных программ допускаются: 1) лица, имеющие среднее профессиональное и (или) высшее образование; 2) лица, получающие среднее профессиональное и (или) высшее образование.";
const staffTemplate = "Обеспечение образовательной программы осуществляется преподавательским составом, как правило, из числа докторов и кандидатов наук КФУ, а также ведущих специалистов и практиков компаний, предприятий, организаций, бизнес-сообществ, научных сотрудников научно-исследовательских и проектных институтов.";
const accessibilityTemplate = "При необходимости в образовательном процессе применяются методы и технологии, облегчающие восприятие информации обучающимися с инвалидностью и ограниченными возможностями здоровья: создаётся текстовая версия нетекстового контента; обеспечивается возможность представления контента без потери информации; предусматриваются визуальный и аудиальный способы восприятия; применяются доступные программные средства и виртуальные лаборатории; используются дистанционные технологии для обучения и текущего контроля. Продолжительность письменного зачёта или экзамена — не более 90 минут, подготовка к устному ответу — не более 20 минут.";

function emptyPlanRow(type: ProgramType): PlanRow {
  return {
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
  };
}

function emptyStudyPlan(): StudyPlan {
  return {
    id: crypto.randomUUID(),
    title: "Учебный план 1",
    rows: [],
    finalAssessmentHours: 0,
    finalAssessmentForm: "",
    finalAssessmentKind: "",
    finalAssessmentKindOther: "",
    scheduleRows: [],
  };
}

export function emptyProgramData(type: ProgramType): ProgramData {
  return {
    institute: "",
    center: "",
    manager: "",
    programAuthors: "",
    city: "Казань",
    year: "2026",
    duration: type === "PP" ? 250 : type === "PK" ? 16 : 0,
    audience: "",
    actuality: "",
    purpose: "",
    goalMode: "fields",
    goalAction: type === "PP" ? "получение компетенции, необходимой для выполнения нового вида профессиональной деятельности" : "совершенствование профессиональной компетенции",
    goalCompetence: "",
    goalNewCompetence: "",
    goalQualification: "",
    goalCustomText: "",
    tasks: "",
    direction: "",
    activity: "",
    laborFunctions: "",
    laborActions: "",
    qualification: "",
    qualificationLevel: "",
    admission: type === "DOOP" ? "" : admissionTemplate,
    basis: "",
    basisProfessionalStandard: "",
    basisProfessionalStandardDetails: "",
    basisEks: "",
    basisEksDetails: "",
    basisFgos: "",
    basisFgosDetails: "",
    basisJustification: "",
    learningForm: "очная",
    learningFormat: "очный",
    competences: "",
    knowledge: "",
    skills: "",
    competenceCriteria: "",
    competenceItems: [""],
    knowledgeItems: [""],
    skillItems: [""],
    plan: [],
    studyPlans: [emptyStudyPlan()],
    finalAssessmentHours: 0,
    finalAssessmentForm: "",
    finalAssessmentKind: "",
    finalAssessmentKindOther: "",
    schedule: "",
    assessmentForms: "",
    assessmentMaterials: "",
    controlMaterials: {},
    interimMaterials: {},
    finalAttestation: "",
    finalAssessmentMaterials: "",
    assessmentCriteria: "",
    finalCriteria: {},
    materialConditions: "",
    materialRows: [{ id: crypto.randomUUID(), room: "", activity: "", equipment: "" }],
    references: "",
    referenceItems: [emptyReferenceItem(), emptyReferenceItem()],
    sectionPrograms: [],
    staffConditions: staffTemplate,
    digitalEnvironment: "",
    digitalRows: [{ id: crypto.randomUUID(), resource: "", activity: "", equipment: "" }],
    accessibility: type === "DOOP" ? accessibilityTemplate : "",
  };
}

function splitLegacy(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.replace(/^[-–•]\s*/, "").trim())
    .filter(Boolean);
}

export function normalizeProgramData(value: string, type: ProgramType): ProgramData {
  const fallback = emptyProgramData(type);
  try {
    const parsed = { ...fallback, ...JSON.parse(value) } as ProgramData;
    if (!parsed.competenceItems?.some(Boolean) && parsed.competences) parsed.competenceItems = splitLegacy(parsed.competences);
    if (!parsed.knowledgeItems?.some(Boolean) && parsed.knowledge) parsed.knowledgeItems = splitLegacy(parsed.knowledge);
    if (!parsed.skillItems?.some(Boolean) && parsed.skills) parsed.skillItems = splitLegacy(parsed.skills);
    const referenceText = (item: Record<string, unknown>) => {
      if (typeof item.value === "string" && item.value.trim()) return item.value;
      const lead = [item.author, item.title].filter(Boolean).join(". ");
      const publication = item.publication ? ` — ${item.publication}` : "";
      const year = item.year ? `, ${item.year}` : "";
      const url = item.url ? ` — URL: ${item.url}` : "";
      const accessed = item.accessDate ? ` (дата обращения: ${item.accessDate})` : "";
      return `${lead}${publication}${year}${url}${accessed}`;
    };
    if (!parsed.referenceItems?.some((item) => referenceText(item as unknown as Record<string, unknown>)) && parsed.references)
      parsed.referenceItems = splitLegacy(parsed.references).map((item) => ({
        ...emptyReferenceItem(),
        title: item,
        value: item,
      }));
    parsed.referenceItems = (parsed.referenceItems ?? []).map((item) => {
      const legacy = referenceText(item as unknown as Record<string, unknown>);
      return {
        ...emptyReferenceItem(item.id || crypto.randomUUID()),
        ...item,
        title: item.title || legacy,
        value: item.value || legacy,
      };
    });
    parsed.finalCriteria = parsed.finalCriteria ?? {};
    if (!parsed.materialRows?.some((item) => item.room || item.activity || item.equipment) && parsed.materialConditions)
      parsed.materialRows = [
        {
          id: crypto.randomUUID(),
          room: "",
          activity: "",
          equipment: parsed.materialConditions,
        },
      ];
    if (!parsed.digitalRows?.some((item) => item.resource || item.activity || item.equipment) && parsed.digitalEnvironment)
      parsed.digitalRows = [
        {
          id: crypto.randomUUID(),
          resource: "",
          activity: "",
          equipment: parsed.digitalEnvironment,
        },
      ];
    const normalizeRow = (row: PlanRow): PlanRow => ({
      ...emptyPlanRow(type),
      ...row,
      distanceLectures: Number(row.distanceLectures) || 0,
      distancePractice: Number(row.distancePractice) || 0,
      distanceLabs: Number(row.distanceLabs) || 0,
      attestationKind: row.attestationKind || "Не выбран",
      attestation: ["Зачёт", "Экзамен"].includes(row.attestation) ? row.attestation : "",
    });
    parsed.plan = (parsed.plan ?? []).map(normalizeRow);
    const legacyPlan = parsed.plan;
    parsed.studyPlans = (
      parsed.studyPlans?.length
        ? parsed.studyPlans
        : [
            {
              ...emptyStudyPlan(),
              rows: legacyPlan,
              finalAssessmentHours: parsed.finalAssessmentHours,
              finalAssessmentForm: parsed.finalAssessmentForm,
              finalAssessmentKind: parsed.finalAssessmentKind || (parsed.finalAttestation ? "Иное" : ""),
              finalAssessmentKindOther: parsed.finalAssessmentKindOther || parsed.finalAttestation,
              scheduleRows: [],
            },
          ]
    ).map((plan, index) => ({
      ...emptyStudyPlan(),
      ...plan,
      title: plan.title || `Учебный план ${index + 1}`,
      finalAssessmentForm: ["Зачёт", "Экзамен"].includes(plan.finalAssessmentForm) ? plan.finalAssessmentForm : "",
      finalAssessmentKind: finalAssessmentKindOptions.includes(plan.finalAssessmentKind as (typeof finalAssessmentKindOptions)[number]) ? plan.finalAssessmentKind : plan.finalAssessmentKind ? "Иное" : "",
      finalAssessmentKindOther: plan.finalAssessmentKind === "Иное" ? plan.finalAssessmentKindOther || "" : finalAssessmentKindOptions.includes(plan.finalAssessmentKind as (typeof finalAssessmentKindOptions)[number]) ? plan.finalAssessmentKindOther || "" : plan.finalAssessmentKind || plan.finalAssessmentKindOther || "",
      rows: (plan.rows ?? []).map(normalizeRow),
      scheduleRows: (plan.scheduleRows ?? []).map((row) => ({
        id: row.id || crypto.randomUUID(),
        planRowId: row.planRowId,
        period: row.period || "",
      })),
    }));
    const planRows = new Map(parsed.studyPlans.flatMap((plan) => plan.rows).map((row) => [row.id, row]));
    parsed.sectionPrograms = (parsed.sectionPrograms ?? []).map((section) => {
      const planRow = planRows.get(section.planRowId);
      return {
        planRowId: section.planRowId,
        currentControl: section.currentControl ?? planRow?.currentControl ?? "Не предусмотрен",
        currentControlOther: section.currentControlOther ?? planRow?.currentControlOther ?? "",
        attestationKind: section.attestationKind ?? planRow?.attestationKind ?? "Не выбран",
        rows: (section.rows ?? []).map((row) => ({
          id: row.id || crypto.randomUUID(),
          topic: row.topic ?? "",
          lectures: row.lectures ?? "",
          lectureHours: Number(row.lectureHours) || 0,
          labs: row.labs ?? "",
          labHours: Number(row.labHours) || 0,
          practice: row.practice ?? "",
          practiceHours: Number(row.practiceHours) || 0,
          selfStudy: row.selfStudy ?? "",
          selfStudyHours: Number(row.selfStudyHours) || 0,
        })),
      };
    });
    if (parsed.learningFormat === "гибридный") {
      parsed.studyPlans = parsed.studyPlans.map((plan) => ({
        ...plan,
        rows: plan.rows.map((row) => ({
          ...row,
          distanceLectures: row.lectures,
          distancePractice: row.practice,
          distanceLabs: row.labs,
        })),
      }));
    }
    while (parsed.referenceItems.length < 2) parsed.referenceItems.push(emptyReferenceItem());
    if (type === "DOOP" && !parsed.accessibility) parsed.accessibility = accessibilityTemplate;
    return parsed;
  } catch {
    return fallback;
  }
}

export function goalText(data: ProgramData, type: ProgramType) {
  if (type !== "PK" && data.goalMode === "paste") return data.goalCustomText.trim();
  if (type === "PP") {
    const qualification = data.goalQualification.trim() ? ` и приобретение новой квалификации «${data.goalQualification.trim()}»` : "";
    return `Целью реализации программы является ${data.goalAction}${data.goalCompetence.trim() ? ` «${data.goalCompetence.trim()}»` : ""}${data.activity.trim() ? ` в области «${data.activity.trim()}»` : ""}${qualification}.`;
  }
  if (type === "DOOP") return `Целью реализации программы является ${data.goalAction}${data.goalCompetence.trim() ? ` «${data.goalCompetence.trim()}»` : ""}.`;
  if (type === "PK" && data.goalAction === "совершенствование имеющейся и получение новой профессиональной компетенции") {
    return `Целью реализации программы является совершенствование компетенции «${data.goalCompetence.trim()}» и получение новой компетенции «${data.goalNewCompetence.trim()}», необходимых для профессиональной деятельности.`;
  }
  return `Целью реализации программы является ${data.goalAction}${data.goalCompetence.trim() ? ` «${data.goalCompetence.trim()}»` : ""}${data.goalQualification.trim() ? ` в рамках имеющейся квалификации «${data.goalQualification.trim()}»` : ""}.`;
}

export function rowContactTotal(row: PlanRow) {
  return (Number(row.lectures) || 0) + (Number(row.labs) || 0) + (Number(row.practice) || 0);
}
export function rowDistanceTotal(row: PlanRow) {
  return (Number(row.distanceLectures) || 0) + (Number(row.distancePractice) || 0) + (Number(row.distanceLabs) || 0);
}
export function rowWorkload(row: PlanRow) {
  return rowContactTotal(row) + (Number(row.selfStudy) || 0);
}
export function planWorkload(data: ProgramData) {
  return data.plan.reduce((sum, row) => sum + rowWorkload(row), 0);
}
export function totalProgramHours(data: ProgramData) {
  return planWorkload(data) + (Number(data.finalAssessmentHours) || 0);
}
export function studyPlans(data: ProgramData) {
  return data.studyPlans?.length
    ? data.studyPlans
    : [
        {
          id: "legacy",
          title: "Учебный план 1",
          rows: data.plan,
          finalAssessmentHours: data.finalAssessmentHours,
          finalAssessmentForm: data.finalAssessmentForm,
          finalAssessmentKind: data.finalAssessmentKind,
          finalAssessmentKindOther: data.finalAssessmentKindOther,
          scheduleRows: [],
        },
      ];
}
export function studyPlanTotal(plan: StudyPlan) {
  return plan.rows.reduce((sum, row) => sum + rowWorkload(row), 0) + (Number(plan.finalAssessmentHours) || 0);
}

export function resolvedFinalAssessmentKind(plan: StudyPlan) {
  return plan.finalAssessmentKind === "Иное" ? plan.finalAssessmentKindOther.trim() : plan.finalAssessmentKind.trim();
}

export function sectionTopicTotals(rows: SectionTopicRow[]) {
  return rows.reduce(
    (sum, row) => ({
      lectures: sum.lectures + (Number(row.lectureHours) || 0),
      labs: sum.labs + (Number(row.labHours) || 0),
      practice: sum.practice + (Number(row.practiceHours) || 0),
      selfStudy: sum.selfStudy + (Number(row.selfStudyHours) || 0),
    }),
    { lectures: 0, labs: 0, practice: 0, selfStudy: 0 },
  );
}

export function sectionProgramControl(section: SectionProgram | undefined) {
  if (!section) return "";
  return section.currentControl === "Иное" ? section.currentControlOther.trim() : section.currentControl.trim();
}

export function criticalValidationErrors(data: ProgramData, type: ProgramType, disciplineRecords: DisciplineRecord[] = []) {
  const errors: string[] = [];
  const plans = studyPlans(data);
  if (plans.some((plan) => plan.rows.length < 2)) errors.push("В каждом учебном плане должно быть не менее двух разделов или дисциплин.");
  const minimum = typeMeta[type].minHours;
  if (minimum && data.duration < minimum) errors.push(`Трудоёмкость программы должна быть не менее ${minimum} часов.`);
  const mismatchedPlans = plans.filter((plan) => data.duration && studyPlanTotal(plan) !== data.duration);
  if (mismatchedPlans.length) errors.push(`${mismatchedPlans.length} учебн. план(а) не совпадают с трудоёмкостью программы ${data.duration} ч.`);
  const plansWithoutFinalKind = plans.filter((plan) => !resolvedFinalAssessmentKind(plan));
  if (plansWithoutFinalKind.length) errors.push("Для каждого учебного плана выберите вид итоговой аттестации или укажите собственный вариант.");
  const plansWithoutFinalForm = plans.filter((plan) => !plan.finalAssessmentForm);
  if (plansWithoutFinalForm.length) errors.push("Для каждого учебного плана выберите форму итоговой аттестации: зачёт или экзамен.");
  const completedReferences = data.referenceItems.filter((item) => item.title.trim() && item.year.trim());
  if (completedReferences.length < 2) errors.push("Добавьте не менее двух источников литературы и укажите год выпуска каждого источника.");
  const invalidYears = data.referenceItems.filter((item) => item.title.trim() && (!/^\d{4}$/.test(item.year.trim()) || Number(item.year) > new Date().getFullYear()));
  if (invalidYears.length) errors.push("Проверьте год выпуска литературы: требуется корректный четырёхзначный год, не превышающий текущий.");
  const electronicWithoutUrl = data.referenceItems.filter((item) => item.kind === "electronic" && item.title.trim() && !/^https?:\/\//i.test(item.url.trim()));
  if (electronicWithoutUrl.length) errors.push("Для каждого электронного источника укажите полную ссылку, начинающуюся с http:// или https://.");

  if (type === "PK" || type === "PP") {
    if (data.goalAction === "совершенствование имеющейся и получение новой профессиональной компетенции" && (!data.goalCompetence.trim() || !data.goalNewCompetence.trim())) errors.push("Для комбинированной цели заполните обе компетенции.");
    if (data.competenceItems.filter((item) => item.trim()).length < 2) errors.push(`Для программы ${type} укажите не менее двух профессиональных компетенций.`);
    if (data.knowledgeItems.filter((item) => item.trim()).length < 2) errors.push(`Для программы ${type} укажите не менее двух планируемых знаний.`);
    if (plans.some((plan) => plan.rows.some((row) => rowWorkload(row) < 1))) errors.push("Трудоёмкость каждого раздела учебного плана должна быть не менее 1 часа.");
    const sectionMap = new Map(data.sectionPrograms.map((section) => [section.planRowId, section]));
    for (const row of plans.flatMap((plan) => plan.rows)) {
      if (type === "PP") continue;
      const section = sectionMap.get(row.id);
      if (!section || !section.rows.length) {
        errors.push(`Заполните рабочую программу раздела «${row.title || "Без наименования"}».`);
        continue;
      }
      const total = sectionTopicTotals(section.rows);
      if (total.lectures !== row.lectures || total.practice !== row.practice || total.labs !== row.labs || total.selfStudy !== row.selfStudy) {
        errors.push(`Часы рабочей программы раздела «${row.title || "Без наименования"}» не совпадают с учебным планом.`);
      }
      if (!sectionProgramControl(section) && section.currentControl !== "Не предусмотрен") errors.push(`Уточните форму текущего контроля для раздела «${row.title || "Без наименования"}».`);
      if (row.attestation && (!section.attestationKind || section.attestationKind === "Не выбран")) errors.push(`Выберите вид промежуточной аттестации в РПР раздела «${row.title || "Без наименования"}».`);
    }
    const onlineOnly = data.learningFormat.startsWith("онлайн");
    if (!onlineOnly && !data.materialRows.some((row) => row.room.trim() && row.activity.trim() && row.equipment.trim())) {
      errors.push("Для форматов, отличных от онлайн, заполните материально-технические условия.");
    }
    if (data.learningFormat !== "очный" && !data.digitalRows.some((row) => row.resource.trim() && row.activity.trim() && row.equipment.trim())) {
      errors.push("Для всех форматов, кроме очного, заполните электронные информационные ресурсы и условия электронной среды.");
    }
    if (type === "PP") {
      const disciplineMap = new Map(
        disciplineRecords.map((record) => {
          const discipline = normalizeDisciplineData(record.data);
          return [discipline.planRowId, { record, discipline }] as const;
        }),
      );
      for (const row of plans.flatMap((plan) => plan.rows)) {
        const linked = disciplineMap.get(row.id);
        if (!linked) {
          errors.push(`Заполните РПД дисциплины «${row.title || "Без наименования"}».`);
          continue;
        }
        const { discipline } = linked;
        if (discipline.competenceItems.filter((item) => item.trim()).length < 2) errors.push(`В РПД «${row.title || "Без наименования"}» укажите не менее двух компетенций.`);
        if (discipline.knowledgeItems.filter((item) => item.trim()).length < 2) errors.push(`В РПД «${row.title || "Без наименования"}» укажите не менее двух знаний.`);
        if (discipline.skillItems.filter((item) => item.trim()).length < 2) errors.push(`В РПД «${row.title || "Без наименования"}» укажите не менее двух умений.`);
        if (discipline.masteryItems.filter((item) => item.trim()).length < 2) errors.push(`В РПД «${row.title || "Без наименования"}» укажите не менее двух владений.`);
        if (!discipline.topicRows.length) errors.push(`Добавьте темы и содержание в РПД «${row.title || "Без наименования"}».`);
        else {
          const total = sectionTopicTotals(discipline.topicRows);
          if (total.lectures !== row.lectures || total.practice !== row.practice || total.labs !== row.labs || total.selfStudy !== row.selfStudy) errors.push(`Часы РПД «${row.title || "Без наименования"}» не совпадают с учебным планом.`);
        }
        const references = discipline.referenceItems.filter((item) => item.title.trim() && item.year.trim());
        if (references.length < 2) errors.push(`В РПД «${row.title || "Без наименования"}» добавьте не менее двух источников литературы.`);
        if (discipline.referenceItems.some((item) => item.title.trim() && (!/^\d{4}$/.test(item.year.trim()) || Number(item.year) > new Date().getFullYear()))) errors.push(`Проверьте годы выпуска литературы в РПД «${row.title || "Без наименования"}».`);
        if (discipline.referenceItems.some((item) => item.kind === "electronic" && item.title.trim() && !/^https?:\/\//i.test(item.url.trim()))) errors.push(`Для электронных источников РПД «${row.title || "Без наименования"}» укажите полные ссылки.`);
      }
    }
  }
  return Array.from(new Set(errors));
}

export function automaticCriteria(form: string) {
  const normalized = form.toLowerCase();
  if (normalized.includes("зачет") || normalized.includes("зачёт")) return "«Зачтено» — слушатель выполнил требования аттестации, продемонстрировал освоение предусмотренных программой знаний и умений и набрал не менее установленного порога.\n«Не зачтено» — требования аттестации не выполнены либо уровень освоения результатов обучения ниже установленного порога.";
  if (normalized.includes("экзамен")) return "5 (отлично) — материал освоен полно, ответы точны, логичны и аргументированы.\n4 (хорошо) — материал освоен в основном полно, допущены отдельные неточности.\n3 (удовлетворительно) — освоены основные положения, имеются пробелы и неточности.\n2 (неудовлетворительно) — основные результаты обучения не достигнуты, допущены существенные ошибки.";
  return "Выберите в учебном плане форму итоговой аттестации «зачёт» или «экзамен» — критерии сформируются автоматически.";
}

export const emptyDisciplineData: DisciplineData = {
  planRowId: "",
  purpose: "",
  competences: "",
  knowledge: "",
  skills: "",
  competenceItems: ["", ""],
  knowledgeItems: ["", ""],
  skillItems: ["", ""],
  masteryItems: ["", ""],
  topicRows: [],
  topics: "",
  currentControl: "",
  interimAssessment: "",
  assessmentMaterials: "",
  criteria: "",
  materialConditions: "",
  materialRows: [],
  references: "",
  referenceItems: [emptyReferenceItem(), emptyReferenceItem()],
  staffConditions: "",
  digitalEnvironment: "",
  digitalRows: [],
};

export function normalizeDisciplineData(value: string): DisciplineData {
  try {
    const parsed = {
      ...emptyDisciplineData,
      ...JSON.parse(value),
    } as DisciplineData;
    if (!parsed.competenceItems.some(Boolean) && parsed.competences) parsed.competenceItems = splitLegacy(parsed.competences);
    if (!parsed.knowledgeItems.some(Boolean) && parsed.knowledge) parsed.knowledgeItems = splitLegacy(parsed.knowledge);
    if (!parsed.skillItems.some(Boolean) && parsed.skills) parsed.skillItems = splitLegacy(parsed.skills);
    parsed.masteryItems = parsed.masteryItems?.length ? parsed.masteryItems : ["", ""];
    parsed.topicRows = (parsed.topicRows ?? []).map((row) => ({
      ...row,
      id: row.id || crypto.randomUUID(),
      lectureHours: Number(row.lectureHours) || 0,
      labHours: Number(row.labHours) || 0,
      practiceHours: Number(row.practiceHours) || 0,
      selfStudyHours: Number(row.selfStudyHours) || 0,
    }));
    if (!parsed.materialRows.length && parsed.materialConditions)
      parsed.materialRows = [
        {
          id: crypto.randomUUID(),
          room: "",
          activity: "",
          equipment: parsed.materialConditions,
        },
      ];
    if (!parsed.referenceItems?.some((item) => item.title.trim()) && parsed.references) parsed.referenceItems = referencesFromDiscipline(parsed.references);
    parsed.referenceItems = (parsed.referenceItems ?? []).map((item) => ({
      ...emptyReferenceItem(item.id || crypto.randomUUID()),
      ...item,
    }));
    while (parsed.referenceItems.length < 2) parsed.referenceItems.push(emptyReferenceItem());
    parsed.digitalRows = parsed.digitalRows ?? [];
    return parsed;
  } catch {
    return { ...emptyDisciplineData };
  }
}

function referencesFromDiscipline(value: string) {
  return value
    .split(/\n+/)
    .map((item) => item.replace(/^[-–•]\s*/, "").trim())
    .filter(Boolean)
    .map((item) => ({
      ...emptyReferenceItem(),
      title: item,
      year: item.match(/\b(?:19|20)\d{2}\b/)?.[0] ?? "",
      value: item,
    }));
}

export function pkProgramDataFromDiscipline(sourceProgram: ProgramRecord, discipline: DisciplineRecord): ProgramData {
  const source = normalizeProgramData(sourceProgram.data, "PP");
  const disciplineData = normalizeDisciplineData(discipline.data);
  const sourceRow = studyPlans(source)
    .flatMap((plan) => plan.rows)
    .find((row) => row.id === disciplineData.planRowId);
  const assessmentParts = disciplineData.interimAssessment
    .split(":")
    .map((item) => item.trim())
    .filter(Boolean);
  const parsedForm = [...assessmentParts].reverse().find((item) => ["Зачёт", "Экзамен"].includes(item)) ?? "";
  const parsedKind = assessmentParts.length > 1 ? assessmentParts.slice(0, -1).join(": ") : "";
  const planRowId = crypto.randomUUID();
  const planRow: PlanRow = sourceRow
    ? { ...sourceRow, id: planRowId, semester: "", title: discipline.title }
    : {
        ...emptyPlanRow("PK"),
        id: planRowId,
        title: discipline.title,
        hours: discipline.hours,
        selfStudy: Math.max(0, Number(discipline.hours) || 0),
        currentControl: disciplineData.currentControl || "Не предусмотрен",
        attestation: parsedForm,
        attestationKind: parsedKind || "Не выбран",
      };
  planRow.attestation = ["Зачёт", "Экзамен"].includes(planRow.attestation) ? planRow.attestation : parsedForm;
  planRow.attestationKind = planRow.attestationKind && planRow.attestationKind !== "Не выбран" ? planRow.attestationKind : parsedKind || "Не выбран";

  const content = disciplineData.topics.trim();
  const fallbackTopicRow: SectionTopicRow = {
    id: crypto.randomUUID(),
    topic: discipline.title,
    lectures: "",
    lectureHours: planRow.lectures,
    labs: "",
    labHours: planRow.labs,
    practice: "",
    practiceHours: planRow.practice,
    selfStudy: "",
    selfStudyHours: planRow.selfStudy,
  };
  if (content) {
    if (planRow.lectures > 0) fallbackTopicRow.lectures = content;
    else if (planRow.practice > 0) fallbackTopicRow.practice = content;
    else if (planRow.labs > 0) fallbackTopicRow.labs = content;
    else fallbackTopicRow.selfStudy = content;
  }

  const competences = disciplineData.competenceItems.map((item) => item.trim()).filter(Boolean);
  const knowledge = disciplineData.knowledgeItems.map((item) => item.trim()).filter(Boolean);
  const skills = disciplineData.skillItems.map((item) => item.trim()).filter(Boolean);
  const importedReferences = disciplineData.referenceItems.some((item) => item.title.trim()) ? disciplineData.referenceItems : referencesFromDiscipline(disciplineData.references);
  const finalForm = planRow.attestation;
  const finalKind = planRow.attestationKind === "Не выбран" ? "" : planRow.attestationKind;
  const actualHours = rowWorkload(planRow) || Math.max(0, Number(discipline.hours) || 0);
  const goalAction = competences.length >= 2 ? "совершенствование имеющейся и получение новой профессиональной компетенции" : "совершенствование профессиональной компетенции";
  const scheduleRow = { id: crypto.randomUUID(), planRowId, period: "" };
  const plan: StudyPlan = {
    id: crypto.randomUUID(),
    title: "Учебный план 1",
    rows: [planRow],
    finalAssessmentHours: 0,
    finalAssessmentForm: finalForm,
    finalAssessmentKind: finalKind,
    finalAssessmentKindOther: "",
    scheduleRows: [scheduleRow],
  };
  const seed: ProgramData = {
    ...emptyProgramData("PK"),
    institute: source.institute,
    center: source.center,
    manager: source.manager,
    city: source.city,
    year: source.year,
    duration: Math.max(typeMeta.PK.minHours, actualHours),
    actuality: source.actuality,
    purpose: disciplineData.purpose,
    goalAction,
    goalCompetence: competences[0] ?? "",
    goalNewCompetence: competences[1] ?? "",
    goalQualification: source.goalQualification,
    tasks: source.tasks,
    direction: source.direction,
    activity: source.activity,
    laborFunctions: source.laborFunctions,
    laborActions: source.laborActions,
    qualification: source.qualification,
    qualificationLevel: source.qualificationLevel,
    admission: source.admission,
    basis: source.basis,
    basisProfessionalStandard: source.basisProfessionalStandard,
    basisProfessionalStandardDetails: source.basisProfessionalStandardDetails,
    basisEks: source.basisEks,
    basisEksDetails: source.basisEksDetails,
    basisFgos: source.basisFgos,
    basisFgosDetails: source.basisFgosDetails,
    basisJustification: source.basisJustification,
    learningForm: source.learningForm,
    learningFormat: source.learningFormat,
    competences: competences.join("\n"),
    knowledge: knowledge.join("\n"),
    skills: skills.join("\n"),
    competenceItems: competences.length ? competences : [""],
    knowledgeItems: knowledge.length ? knowledge : [""],
    skillItems: skills.length ? skills : [""],
    plan: [planRow],
    studyPlans: [plan],
    finalAssessmentHours: 0,
    finalAssessmentForm: finalForm,
    finalAssessmentKind: finalKind,
    assessmentMaterials: disciplineData.assessmentMaterials,
    interimMaterials: finalForm && disciplineData.assessmentMaterials ? { [finalForm]: disciplineData.assessmentMaterials } : {},
    finalAssessmentMaterials: disciplineData.assessmentMaterials,
    assessmentCriteria: disciplineData.criteria,
    finalCriteria: finalForm && disciplineData.criteria ? { [finalForm]: disciplineData.criteria } : {},
    materialConditions: disciplineData.materialConditions,
    materialRows: disciplineData.materialRows.length ? disciplineData.materialRows : source.materialRows,
    references: disciplineData.references,
    referenceItems: importedReferences.length ? importedReferences : source.referenceItems,
    sectionPrograms: [
      {
        planRowId,
        rows: disciplineData.topicRows.length ? disciplineData.topicRows : [fallbackTopicRow],
        currentControl: disciplineData.currentControl || "Не предусмотрен",
        currentControlOther: "",
        attestationKind: planRow.attestationKind,
      },
    ],
    staffConditions: disciplineData.staffConditions || source.staffConditions,
    digitalEnvironment: disciplineData.digitalEnvironment || source.digitalEnvironment,
    digitalRows: disciplineData.digitalRows.length ? disciplineData.digitalRows : source.digitalRows,
  };
  return normalizeProgramData(JSON.stringify(seed), "PK");
}
