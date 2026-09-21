import { AlignmentType, BorderStyle, Document, Header, HeadingLevel, LineRuleType, PageBreak, PageNumber, PageOrientation, Packer, Paragraph, Table, TableCell, TableLayoutType, TableRow, TextRun, VerticalAlign, WidthType } from "docx";
import { automaticCriteria, formatReference, goalText, normalizeDisciplineData, resolvedFinalAssessmentKind, rowContactTotal, rowWorkload, sectionProgramControl, sectionTopicTotals, studyPlans, studyPlanTotal, typeMeta, type DigitalRow, type DisciplineData, type MaterialRow, type ProgramData, type ProgramType, type SectionTopicRow, type StudyPlan } from "@/lib/program-model";

export type ExportProgram = { title: string; type: ProgramType };
export type ExportDiscipline = { title: string; hours: number; data: string };

const FONT = "Times New Roman";
const TEXT_SIZE = 24;
const BODY_LINE = 276;
const SINGLE_LINE = 240;
const FIRST_LINE = 709;
const CONTENT_WIDTH = 10_205;

const borders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
};

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
};

type ParagraphOptions = {
  bold?: boolean;
  center?: boolean;
  right?: boolean;
  italic?: boolean;
  compact?: boolean;
  firstLine?: boolean;
  keepNext?: boolean;
  pageBreakBefore?: boolean;
  before?: number;
  after?: number;
};

function paragraph(text = "", options: ParagraphOptions = {}) {
  const alignment = options.center ? AlignmentType.CENTER : options.right ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED;
  const compact = options.compact || options.center || options.right;
  return new Paragraph({
    alignment,
    indent: options.firstLine === false || compact ? { firstLine: 0 } : { firstLine: FIRST_LINE },
    keepNext: options.keepNext,
    keepLines: true,
    pageBreakBefore: options.pageBreakBefore,
    spacing: {
      line: compact ? SINGLE_LINE : BODY_LINE,
      lineRule: LineRuleType.AUTO,
      before: options.before ?? 0,
      after: options.after ?? 0,
    },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italic,
        size: TEXT_SIZE,
        font: FONT,
        color: "000000",
      }),
    ],
  });
}

function heading(text: string, level: 1 | 2 | 3 = 1, pageBreakBefore = false) {
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
    indent: { firstLine: 0 },
    keepNext: true,
    keepLines: true,
    pageBreakBefore,
    spacing: {
      line: BODY_LINE,
      lineRule: LineRuleType.AUTO,
      before: level === 1 ? 240 : 180,
      after: 120,
    },
    children: [
      new TextRun({
        text,
        bold: true,
        size: TEXT_SIZE,
        font: FONT,
        color: "000000",
      }),
    ],
  });
}

function textLines(value: string) {
  const lines = value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.length ? lines.map((line) => paragraph(line)) : [paragraph("____________________________")];
}

function labeled(label: string, value: string) {
  return [paragraph(label, { bold: true, keepNext: true }), ...textLines(value)];
}

function listValues(values: string[]) {
  const present = values.map((value) => value.trim()).filter(Boolean);
  return present.length ? present.map((value) => paragraph(`– ${value}`)) : [paragraph("____________________________")];
}

function numberedValues(values: string[]) {
  const present = values.map((value) => value.trim()).filter(Boolean);
  return present.length ? present.map((value, index) => paragraph(`${index + 1}. ${value}`)) : [paragraph("____________________________")];
}

type CellOptions = {
  bold?: boolean;
  columnSpan?: number;
  rowSpan?: number;
  width?: number;
  align?: "left" | "center" | "right";
  lineAlignments?: Array<"left" | "center" | "right">;
  borderless?: boolean;
};

function cell(value: string | number, options: CellOptions = {}) {
  const alignment = options.align === "left" ? AlignmentType.LEFT : options.align === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER;
  return new TableCell({
    borders: options.borderless ? noBorders : borders,
    columnSpan: options.columnSpan,
    rowSpan: options.rowSpan,
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 70, right: 70 },
    children: [
      new Paragraph({
        alignment,
        indent: { firstLine: 0 },
        spacing: { line: SINGLE_LINE, lineRule: LineRuleType.AUTO, after: 0 },
        children: [
          new TextRun({
            text: String(value ?? ""),
            bold: options.bold,
            size: TEXT_SIZE,
            font: FONT,
            color: "000000",
          }),
        ],
      }),
    ],
  });
}

function multiParagraphCell(lines: string[], options: CellOptions = {}) {
  const resolveAlignment = (align?: "left" | "center" | "right") => (align === "left" ? AlignmentType.LEFT : align === "right" ? AlignmentType.RIGHT : AlignmentType.CENTER);
  const alignment = resolveAlignment(options.align);
  return new TableCell({
    borders: options.borderless ? noBorders : borders,
    width: options.width ? { size: options.width, type: WidthType.DXA } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 0, bottom: 0, left: 70, right: 70 },
    children: lines.map(
      (line, index) =>
        new Paragraph({
          alignment: options.lineAlignments?.[index] ? resolveAlignment(options.lineAlignments[index]) : alignment,
          indent: { firstLine: 0 },
          spacing: { line: SINGLE_LINE, lineRule: LineRuleType.AUTO, after: 0 },
          children: [
            new TextRun({
              text: line,
              bold: options.bold,
              size: TEXT_SIZE,
              font: FONT,
              color: "000000",
            }),
          ],
        }),
    ),
  });
}

function fixedTable(rows: TableRow[], width = CONTENT_WIDTH, borderless = false, columnWidths?: number[]) {
  return new Table({
    width: { size: width, type: WidthType.DXA },
    columnWidths,
    layout: TableLayoutType.FIXED,
    borders: borderless ? noBorders : borders,
    rows,
  });
}

function formatHours(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function planTable(data: ProgramData, type: ProgramType, plan: StudyPlan) {
  const showDistance = data.learningFormat !== "очный";
  const hybrid = data.learningFormat === "гибридный";
  const showCurrentControl = type === "PP";
  const widths = {
    semester: 480,
    title: showDistance ? 1_500 : 2_400,
    workload: 650,
    total: 620,
    detail: showDistance ? 480 : 690,
    selfStudy: 560,
    current: 850,
    attestation: 500,
  };
  const groupWidth = widths.total + widths.detail * 3;
  const topHeader = [
    ...(type === "PP" ? [cell("Семестр", { bold: true, rowSpan: 3, width: widths.semester })] : []),
    cell(type === "PP" ? "Наименование дисциплины (модуля)" : "Наименование раздела (дисциплины)", { bold: true, rowSpan: 3, width: widths.title }),
    cell("Трудоёмкость, час", {
      bold: true,
      rowSpan: 3,
      width: widths.workload,
    }),
    cell("Аудиторные занятия", {
      bold: true,
      columnSpan: 4,
      width: groupWidth,
    }),
    ...(showDistance
      ? [
          cell("Дистанционные занятия", {
            bold: true,
            columnSpan: 4,
            width: groupWidth,
          }),
        ]
      : []),
    cell("СРС, час", { bold: true, rowSpan: 3, width: widths.selfStudy }),
    ...(showCurrentControl
      ? [
          cell("Текущий контроль", {
            bold: true,
            rowSpan: 3,
            width: widths.current,
          }),
        ]
      : []),
    cell("Промежуточная аттестация", {
      bold: true,
      columnSpan: 2,
      width: widths.attestation * 2,
    }),
  ];
  const secondHeader = [
    cell("Всего, час", { bold: true, rowSpan: 2, width: widths.total }),
    cell("в том числе", {
      bold: true,
      columnSpan: 3,
      width: widths.detail * 3,
    }),
    ...(showDistance
      ? [
          cell("Всего, час", { bold: true, rowSpan: 2, width: widths.total }),
          cell("в том числе", {
            bold: true,
            columnSpan: 3,
            width: widths.detail * 3,
          }),
        ]
      : []),
    cell("Зачёт", { bold: true, rowSpan: 2, width: widths.attestation }),
    cell("Экзамен", { bold: true, rowSpan: 2, width: widths.attestation }),
  ];
  const thirdHeader = [cell("лекции", { bold: true, width: widths.detail }), cell("лабораторные работы", { bold: true, width: widths.detail }), cell("практические занятия", { bold: true, width: widths.detail }), ...(showDistance ? [cell("лекции", { bold: true, width: widths.detail }), cell("лабораторные работы", { bold: true, width: widths.detail }), cell("практические занятия", { bold: true, width: widths.detail })] : [])];
  const columnCount = (type === "PP" ? 1 : 0) + 2 + 4 + (showDistance ? 4 : 0) + 1 + (showCurrentControl ? 1 : 0) + 2;
  const columnWidths = [...(type === "PP" ? [widths.semester] : []), widths.title, widths.workload, widths.total, widths.detail, widths.detail, widths.detail, ...(showDistance ? [widths.total, widths.detail, widths.detail, widths.detail] : []), widths.selfStudy, ...(showCurrentControl ? [widths.current] : []), widths.attestation, widths.attestation];
  const numberRow = Array.from({ length: columnCount }, (_, index) => cell(index + 1, { bold: true, width: columnWidths[index] }));
  const values = plan.rows.map((row) => {
    const distanceLectures = hybrid ? row.lectures : row.distanceLectures;
    const distanceLabs = hybrid ? row.labs : row.distanceLabs;
    const distancePractice = hybrid ? row.practice : row.distancePractice;
    const faceTotal = rowContactTotal(row);
    const distanceTotal = distanceLectures + distanceLabs + distancePractice;
    return [
      ...(type === "PP" ? [cell(row.semester, { width: widths.semester })] : []),
      cell(row.title, { align: "left", width: widths.title }),
      cell(formatHours(rowWorkload(row)), { width: widths.workload }),
      cell(formatHours(faceTotal), { width: widths.total }),
      cell(formatHours(row.lectures), { width: widths.detail }),
      cell(formatHours(row.labs), { width: widths.detail }),
      cell(formatHours(row.practice), { width: widths.detail }),
      ...(showDistance ? [cell(formatHours(distanceTotal), { width: widths.total }), cell(formatHours(distanceLectures), { width: widths.detail }), cell(formatHours(distanceLabs), { width: widths.detail }), cell(formatHours(distancePractice), { width: widths.detail })] : []),
      cell(formatHours(row.selfStudy), { width: widths.selfStudy }),
      ...(showCurrentControl ? [cell(row.currentControl === "Иное" ? row.currentControlOther : row.currentControl, { width: widths.current })] : []),
      cell(row.attestation === "Зачёт" ? "+" : "–", {
        width: widths.attestation,
      }),
      cell(row.attestation === "Экзамен" ? "+" : "–", {
        width: widths.attestation,
      }),
    ];
  });
  const totals = plan.rows.reduce(
    (acc, row) => {
      const dl = hybrid ? row.lectures : row.distanceLectures;
      const dlab = hybrid ? row.labs : row.distanceLabs;
      const dp = hybrid ? row.practice : row.distancePractice;
      return {
        workload: acc.workload + rowWorkload(row),
        face: acc.face + rowContactTotal(row),
        lectures: acc.lectures + row.lectures,
        labs: acc.labs + row.labs,
        practice: acc.practice + row.practice,
        distance: acc.distance + dl + dlab + dp,
        distanceLectures: acc.distanceLectures + dl,
        distanceLabs: acc.distanceLabs + dlab,
        distancePractice: acc.distancePractice + dp,
        selfStudy: acc.selfStudy + row.selfStudy,
      };
    },
    {
      workload: 0,
      face: 0,
      lectures: 0,
      labs: 0,
      practice: 0,
      distance: 0,
      distanceLectures: 0,
      distanceLabs: 0,
      distancePractice: 0,
      selfStudy: 0,
    },
  );
  const summaryValues: Array<string | number> = [...(type === "PP" ? [""] : []), "Всего", formatHours(totals.workload), formatHours(totals.face), formatHours(totals.lectures), formatHours(totals.labs), formatHours(totals.practice), ...(showDistance ? [formatHours(totals.distance), formatHours(totals.distanceLectures), formatHours(totals.distanceLabs), formatHours(totals.distancePractice)] : []), formatHours(totals.selfStudy), ...(showCurrentControl ? [""] : []), "", ""];
  const assessmentInDistance = showDistance && data.learningFormat.startsWith("онлайн");
  const finalValues: Array<string | number> = [...(type === "PP" ? [""] : []), "Итоговая аттестация", formatHours(plan.finalAssessmentHours), assessmentInDistance ? "" : formatHours(plan.finalAssessmentHours), "", "", "", ...(showDistance ? [assessmentInDistance ? formatHours(plan.finalAssessmentHours) : "", "", "", ""] : []), "", ...(showCurrentControl ? [""] : []), plan.finalAssessmentForm === "Зачёт" ? formatHours(plan.finalAssessmentHours) : "", plan.finalAssessmentForm === "Экзамен" ? formatHours(plan.finalAssessmentHours) : ""];
  const grandValues: Array<string | number> = [...(type === "PP" ? [""] : []), "Итого", formatHours(totals.workload + plan.finalAssessmentHours), formatHours(totals.face + (assessmentInDistance ? 0 : plan.finalAssessmentHours)), formatHours(totals.lectures), formatHours(totals.labs), formatHours(totals.practice), ...(showDistance ? [formatHours(totals.distance + (assessmentInDistance ? plan.finalAssessmentHours : 0)), formatHours(totals.distanceLectures), formatHours(totals.distanceLabs), formatHours(totals.distancePractice)] : []), formatHours(totals.selfStudy), ...(showCurrentControl ? [""] : []), plan.finalAssessmentForm === "Зачёт" ? formatHours(plan.finalAssessmentHours) : "", plan.finalAssessmentForm === "Экзамен" ? formatHours(plan.finalAssessmentHours) : ""];
  const summaryRow = (row: Array<string | number>, bold = false) =>
    new TableRow({
      children: row.map((value, index) =>
        cell(value, {
          bold,
          align: index === (type === "PP" ? 1 : 0) ? "left" : "center",
        }),
      ),
    });
  return fixedTable([new TableRow({ tableHeader: true, children: topHeader }), new TableRow({ tableHeader: true, children: secondHeader }), new TableRow({ tableHeader: true, children: thirdHeader }), new TableRow({ tableHeader: true, children: numberRow }), ...values.map((children) => new TableRow({ children })), summaryRow(summaryValues, true), summaryRow(finalValues), summaryRow(grandValues, true)], CONTENT_WIDTH, false, columnWidths);
}

function scheduleTable(plan: StudyPlan) {
  const values = plan.rows.map((row) => [plan.scheduleRows.find((item) => item.planRowId === row.id)?.period ?? "", row.title]);
  return fixedTable(
    [
      new TableRow({
        tableHeader: true,
        children: [
          cell("Период обучения (дни, недели)", { bold: true, width: 2_400 }),
          cell("Наименование раздела (дисциплины)", {
            bold: true,
            width: 7_805,
          }),
        ],
      }),
      ...(values.length ? values : [["", ""]]).map(
        (row) =>
          new TableRow({
            cantSplit: true,
            children: [cell(row[0], { width: 2_400 }), cell(row[1], { align: "left", width: 7_805 })],
          }),
      ),
    ],
    CONTENT_WIDTH,
    false,
    [2_400, 7_805],
  );
}

function sectionProgramBlocks(data: ProgramData) {
  const byRow = new Map(data.sectionPrograms.map((item) => [item.planRowId, item]));
  const emptyTopic: SectionTopicRow = {
    id: "empty",
    topic: "",
    lectures: "",
    lectureHours: 0,
    labs: "",
    labHours: 0,
    practice: "",
    practiceHours: 0,
    selfStudy: "",
    selfStudyHours: 0,
  };
  const plans = studyPlans(data);
  const sections = plans.flatMap((plan, planIndex) =>
    plan.rows.map((row, rowIndex) => {
      const section = byRow.get(row.id);
      return {
        plan,
        planIndex,
        row,
        rowIndex,
        source: section?.rows.length ? section.rows : [emptyTopic],
      };
    }),
  );
  const allTopics = sections.flatMap((section) => section.source);
  const activityColumns = [
    {
      header: "Содержание лекций (количество часов)",
      text: (topic: SectionTopicRow) => topic.lectures,
      hours: (topic: SectionTopicRow) => topic.lectureHours,
      total: (topics: SectionTopicRow[]) => sectionTopicTotals(topics).lectures,
    },
    {
      header: "Наименование лабораторных работ (количество часов)",
      text: (topic: SectionTopicRow) => topic.labs,
      hours: (topic: SectionTopicRow) => topic.labHours,
      total: (topics: SectionTopicRow[]) => sectionTopicTotals(topics).labs,
    },
    {
      header: "Наименование практических занятий или семинаров (количество часов)",
      text: (topic: SectionTopicRow) => topic.practice,
      hours: (topic: SectionTopicRow) => topic.practiceHours,
      total: (topics: SectionTopicRow[]) => sectionTopicTotals(topics).practice,
    },
    {
      header: "Виды СРС (количество часов)",
      text: (topic: SectionTopicRow) => topic.selfStudy,
      hours: (topic: SectionTopicRow) => topic.selfStudyHours,
      total: (topics: SectionTopicRow[]) => sectionTopicTotals(topics).selfStudy,
    },
  ].filter((column) => allTopics.some((topic) => column.text(topic).trim() || column.hours(topic) > 0));
  const topicWidth = activityColumns.length ? 2_600 : CONTENT_WIDTH;
  const detailWidth = activityColumns.length ? Math.floor((CONTENT_WIDTH - topicWidth) / activityColumns.length) : 0;
  const widths = [topicWidth, ...activityColumns.map((_, index) => (index === activityColumns.length - 1 ? CONTENT_WIDTH - topicWidth - detailWidth * (activityColumns.length - 1) : detailWidth))];
  const display = (text: string, hours: number) => [text.trim(), hours ? `${formatHours(hours)} ч.` : ""].filter(Boolean).join("\n");
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: [
        cell("№, наименование раздела и темы", {
          bold: true,
          width: widths[0],
        }),
        ...activityColumns.map((column, index) => cell(column.header, { bold: true, width: widths[index + 1] })),
      ],
    }),
    new TableRow({
      tableHeader: true,
      children: widths.map((width, index) => cell(index + 1, { bold: true, width })),
    }),
  ];
  sections.forEach(({ plan, planIndex, row, rowIndex, source }) => {
    if (plans.length > 1 && rowIndex === 0)
      rows.push(
        new TableRow({
          children: [
            cell(plan.title, {
              bold: true,
              align: "left",
              columnSpan: widths.length,
              width: CONTENT_WIDTH,
            }),
          ],
        }),
      );
    const sectionNumber = plans.length > 1 ? `${planIndex + 1}.${rowIndex + 1}` : `${rowIndex + 1}`;
    rows.push(
      new TableRow({
        children: [
          cell(`${sectionNumber}. ${row.title || `Раздел ${rowIndex + 1}`}`, {
            bold: true,
            align: "left",
            columnSpan: widths.length,
            width: CONTENT_WIDTH,
          }),
        ],
      }),
    );
    source.forEach((topic, topicIndex) =>
      rows.push(
        new TableRow({
          children: [
            cell(`${sectionNumber}.${topicIndex + 1}. ${topic.topic}`.trim(), {
              align: "left",
              width: widths[0],
            }),
            ...activityColumns.map((column, index) =>
              cell(display(column.text(topic), column.hours(topic)), {
                align: "left",
                width: widths[index + 1],
              }),
            ),
          ],
        }),
      ),
    );
    if (activityColumns.length)
      rows.push(
        new TableRow({
          children: [
            cell("Итого по разделу", {
              bold: true,
              align: "left",
              width: widths[0],
            }),
            ...activityColumns.map((column, index) =>
              cell(`${formatHours(column.total(source))} ч.`, {
                bold: true,
                width: widths[index + 1],
              }),
            ),
          ],
        }),
      );
  });
  return [fixedTable(rows, CONTENT_WIDTH, false, widths)];
}

function conditionsTable(rows: MaterialRow[] | DigitalRow[], kind: "material" | "digital") {
  const header = kind === "material" ? ["Наименование специализированных учебных помещений", "Вид занятий", "Наименование оборудования, программного обеспечения"] : ["Электронные информационные ресурсы", "Вид занятий", "Наименование оборудования, программного обеспечения"];
  const widths = [3_400, 2_000, 4_805];
  const values = rows.map((row) => (kind === "material" ? [(row as MaterialRow).room, row.activity, row.equipment] : [(row as DigitalRow).resource, row.activity, row.equipment]));
  return fixedTable(
    [
      new TableRow({
        tableHeader: true,
        children: header.map((value, index) => cell(value, { bold: true, width: widths[index] })),
      }),
      ...(values.length ? values : [["", "", ""]]).map(
        (row) =>
          new TableRow({
            children: row.map((value, index) => cell(value, { align: "left", width: widths[index] })),
          }),
      ),
    ],
    CONTENT_WIDTH,
    false,
    widths,
  );
}

function currentControlBlocks(data: ProgramData, type: ProgramType) {
  const forms = Array.from(
    new Set(
      (type === "PK"
        ? data.sectionPrograms.map(sectionProgramControl)
        : studyPlans(data)
            .flatMap((plan) => plan.rows)
            .map((row) => (row.currentControl === "Иное" ? row.currentControlOther : row.currentControl))
      ).filter((value) => value && value !== "Не предусмотрен"),
    ),
  );
  return forms.flatMap((form) => labeled(form, data.controlMaterials[form] ?? ""));
}

function disciplineProgramsTable(records: ExportDiscipline[]) {
  const normalized = records.map((record) => ({
    record,
    data: normalizeDisciplineData(record.data),
  }));
  const topics = normalized.flatMap(({ data }) => data.topicRows);
  const columns = [
    { key: "topic", title: "Наименование дисциплины / темы", enabled: true },
    {
      key: "lectures",
      title: "Лекции",
      enabled: topics.some((row) => row.lectureHours || row.lectures.trim()),
    },
    {
      key: "practice",
      title: "Практические занятия",
      enabled: topics.some((row) => row.practiceHours || row.practice.trim()),
    },
    {
      key: "labs",
      title: "Лабораторные работы",
      enabled: topics.some((row) => row.labHours || row.labs.trim()),
    },
    {
      key: "selfStudy",
      title: "Самостоятельная работа",
      enabled: topics.some((row) => row.selfStudyHours || row.selfStudy.trim()),
    },
  ].filter((column) => column.enabled);
  const widths = columns.map((_, index) => (index === 0 ? Math.round(CONTENT_WIDTH * 0.34) : Math.round((CONTENT_WIDTH * 0.66) / Math.max(columns.length - 1, 1))));
  const joined = (label: string, values: string[]) =>
    `${label}: ${
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .join("; ") || "не указано"
    }`;
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: columns.map((column, index) => cell(column.title, { bold: true, width: widths[index] })),
    }),
  ];
  normalized.forEach(({ record, data }, recordIndex) => {
    const all = columns.length;
    const refs = data.referenceItems.filter((item) => item.title.trim()).map(formatReference);
    const materials = data.materialRows.filter((row) => row.room || row.activity || row.equipment).map((row) => [row.room, row.activity, row.equipment].filter(Boolean).join(" — "));
    rows.push(
      new TableRow({
        children: [
          cell(`${recordIndex + 1}. ${record.title} (${formatHours(record.hours)} час.)`, {
            bold: true,
            align: "left",
            columnSpan: all,
            width: CONTENT_WIDTH,
          }),
        ],
      }),
    );
    [`Цель освоения дисциплины: ${data.purpose || "не указана"}`, joined("Компетенции", data.competenceItems), joined("Знать", data.knowledgeItems), joined("Уметь", data.skillItems), joined("Владеть", data.masteryItems)].forEach((value) =>
      rows.push(
        new TableRow({
          children: [
            cell(value, {
              align: "left",
              columnSpan: all,
              width: CONTENT_WIDTH,
            }),
          ],
        }),
      ),
    );
    const topicRows = data.topicRows.length
      ? data.topicRows
      : [
          {
            id: "legacy",
            topic: data.topics,
            lectures: "",
            lectureHours: 0,
            labs: "",
            labHours: 0,
            practice: "",
            practiceHours: 0,
            selfStudy: "",
            selfStudyHours: 0,
          },
        ];
    topicRows.forEach((topic, topicIndex) =>
      rows.push(
        new TableRow({
          children: columns.map((column, index) => {
            if (column.key === "topic")
              return cell(`${topicIndex + 1}. ${topic.topic}`, {
                align: "left",
                width: widths[index],
              });
            if (column.key === "lectures") return cell(`${topic.lectures}${topic.lectureHours ? ` (${formatHours(topic.lectureHours)} ч.)` : ""}`, { align: "left", width: widths[index] });
            if (column.key === "practice") return cell(`${topic.practice}${topic.practiceHours ? ` (${formatHours(topic.practiceHours)} ч.)` : ""}`, { align: "left", width: widths[index] });
            if (column.key === "labs") return cell(`${topic.labs}${topic.labHours ? ` (${formatHours(topic.labHours)} ч.)` : ""}`, { align: "left", width: widths[index] });
            return cell(`${topic.selfStudy}${topic.selfStudyHours ? ` (${formatHours(topic.selfStudyHours)} ч.)` : ""}`, { align: "left", width: widths[index] });
          }),
        }),
      ),
    );
    const totals = sectionTopicTotals(topicRows);
    rows.push(
      new TableRow({
        children: columns.map((column, index) => cell(column.key === "topic" ? "Итого" : column.key === "lectures" ? totals.lectures : column.key === "practice" ? totals.practice : column.key === "labs" ? totals.labs : totals.selfStudy, { bold: true, width: widths[index] })),
      }),
    );
    [`Текущий контроль: ${data.currentControl || "не предусмотрен"}. Промежуточная аттестация: ${data.interimAssessment || "не предусмотрена"}.`, `Оценочные материалы: ${data.assessmentMaterials || "не указаны"}`, `Критерии оценки: ${data.criteria || "не указаны"}`, `Материально-технические условия: ${materials.join("; ") || "не указаны"}`, `Учебно-методическое и информационное обеспечение: ${refs.join("; ") || "не указано"}`, `Кадровые условия: ${data.staffConditions || "не указаны"}`].forEach((value) =>
      rows.push(
        new TableRow({
          children: [
            cell(value, {
              align: "left",
              columnSpan: all,
              width: CONTENT_WIDTH,
            }),
          ],
        }),
      ),
    );
  });
  return fixedTable(rows, CONTENT_WIDTH, false, widths);
}

function titlePage(program: ExportProgram, data: ProgramData) {
  const programTypeLines = program.type === "PK" ? ["Дополнительная профессиональная программа", "повышения квалификации"] : program.type === "PP" ? ["Дополнительная профессиональная программа", "профессиональной переподготовки"] : ["Дополнительная общеобразовательная общеразвивающая программа"];
  const approvalTable = fixedTable(
    [
      new TableRow({
        children: [
          cell("", { borderless: true, width: 5_200 }),
          multiParagraphCell(["УТВЕРЖДАЮ", "", "Проректор", "", "", "", "", "", "", "", "______________  Хайруллин И.А.", "(подпись)", "«____» ____________ 20__ г."], {
            borderless: true,
            align: "left",
            lineAlignments: ["center"],
            width: 5_005,
          }),
        ],
      }),
    ],
    CONTENT_WIDTH,
    true,
  );
  const managerTable = fixedTable(
    [
      new TableRow({
        children: [
          multiParagraphCell(["Руководитель", "образовательной программы"], {
            borderless: true,
            align: "left",
            width: 5_200,
          }),
          multiParagraphCell([data.manager || "________________"], {
            borderless: true,
            align: "right",
            width: 5_005,
          }),
        ],
      }),
    ],
    CONTENT_WIDTH,
    true,
  );
  return [
    paragraph("Министерство науки и высшего образования Российской Федерации", {
      center: true,
      compact: true,
    }),
    paragraph("Федеральное государственное автономное", {
      center: true,
      compact: true,
    }),
    paragraph("образовательное учреждение высшего образования", {
      center: true,
      compact: true,
    }),
    paragraph("«Казанский (Приволжский) федеральный университет»", {
      center: true,
      compact: true,
    }),
    paragraph(data.institute || "Институт __________________________", {
      center: true,
      compact: true,
    }),
    paragraph(data.center || "Центр __________________________", {
      center: true,
      compact: true,
    }),
    paragraph("", { compact: true, before: 120 }),
    approvalTable,
    ...programTypeLines.map((line, index) =>
      paragraph(line, {
        center: true,
        compact: true,
        bold: true,
        before: index === 0 ? 1_000 : 0,
      }),
    ),
    paragraph(`«${program.title}»`, {
      center: true,
      compact: true,
      bold: true,
    }),
    paragraph("", { compact: true, before: 1_800 }),
    managerTable,
    paragraph(`${data.city || "Казань"} – ${data.year || "2026"}`, {
      center: true,
      compact: true,
      before: 1_200,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

function basisText(data: ProgramData) {
  return [data.basisProfessionalStandard && `Профессиональный стандарт: ${data.basisProfessionalStandard}${data.basisProfessionalStandardDetails ? `, ${data.basisProfessionalStandardDetails}` : ""}`, data.basisEks && `Квалификационные требования / ЕКС: ${data.basisEks}${data.basisEksDetails ? `, ${data.basisEksDetails}` : ""}`, data.basisFgos && `ФГОС ВО: ${data.basisFgos}${data.basisFgosDetails ? `, ${data.basisFgosDetails}` : ""}`, data.basisJustification && `Обоснование отсутствия основания: ${data.basisJustification}`].filter(Boolean).join("\n") || data.basis;
}

function generalCharacteristics(data: ProgramData, type: ProgramType) {
  if (type === "DOOP") {
    return [
      heading("1. ОБЩАЯ ХАРАКТЕРИСТИКА ПРОГРАММЫ"),
      heading("1.1. Нормативные правовые основания разработки программы", 2),
      ...textLines(data.basis),
      heading("1.2. Актуальность программы", 2),
      ...textLines(data.actuality),
      heading("1.3. Цель и задачи программы", 2),
      ...textLines(data.tasks),
      heading("1.4. Направленность программы", 2),
      ...textLines(data.direction),
      heading("1.5. Категории обучающихся", 2),
      ...textLines(data.audience),
      heading(`1.6. Форма обучения – ${data.learningForm}`, 2),
      heading(`1.7. Формат обучения – ${data.learningFormat}`, 2),
      heading("1.8. Планируемые результаты обучения", 2),
      paragraph("Профессиональные компетенции при наличии", { bold: true }),
      ...listValues(data.competenceItems),
      paragraph("Слушатель, успешно освоивший программу, должен знать", {
        bold: true,
      }),
      ...listValues(data.knowledgeItems),
      paragraph("Слушатель, успешно освоивший программу, должен уметь", {
        bold: true,
      }),
      ...listValues(data.skillItems),
    ];
  }
  if (type === "PP") {
    return [
      heading("1. ОБЩАЯ ХАРАКТЕРИСТИКА ПРОГРАММЫ"),
      heading("1.1. Цель реализации программы", 2),
      ...textLines(goalText(data, type)),
      heading("1.2. Характеристика нового вида профессиональной деятельности и присваиваемой квалификации", 2),
      ...labeled("1.2.1. Вид профессиональной деятельности", data.activity),
      ...labeled("1.2.2. Трудовые функции", data.laborFunctions),
      ...labeled("1.2.3. Трудовые действия", data.laborActions),
      ...labeled("1.2.4. Присваиваемая квалификация", data.qualification),
      ...labeled("1.2.5. Уровень квалификации", data.qualificationLevel),
      heading("1.3. Планируемые результаты обучения", 2),
      heading("1.3.1. Перечень новых и совершенствуемых профессиональных компетенций", 3),
      ...listValues(data.competenceItems),
      heading("1.3.2. Планируемые знания и умения, обеспечивающие формирование новых компетенций", 3),
      paragraph("Слушатель, успешно освоивший программу, должен знать", {
        bold: true,
      }),
      ...listValues(data.knowledgeItems),
      paragraph("Слушатель, успешно освоивший программу, должен уметь", {
        bold: true,
      }),
      ...listValues(data.skillItems),
      heading("1.4. Требования к уровню подготовки поступающего на обучение", 2),
      ...textLines(data.admission),
      heading("1.5. Программа разработана на основе", 2),
      ...textLines(basisText(data)),
      heading(`1.6. Форма обучения – ${data.learningForm}`, 2),
      heading(`1.7. Формат обучения – ${data.learningFormat}`, 2),
    ];
  }
  return [heading("1. ОБЩАЯ ХАРАКТЕРИСТИКА ПРОГРАММЫ"), heading("1.1. Цель реализации программы", 2), ...textLines(goalText(data, type)), heading("1.2. Планируемые результаты обучения", 2), heading("1.2.1. Перечень профессиональных компетенций, подлежащих совершенствованию (качественному изменению) в результате обучения", 3), paragraph("Программа направлена на совершенствование следующих профессиональных компетенций:"), ...listValues(data.competenceItems), heading("1.2.2. Планируемые знания и умения, обеспечивающие формирование и совершенствование компетенций", 3), paragraph("В результате изучения программы повышения квалификации обучающиеся должны:"), paragraph("знать:", { bold: true }), ...listValues(data.knowledgeItems), paragraph("уметь:", { bold: true }), ...listValues(data.skillItems), heading("1.3. Требования к уровню подготовки поступающего на обучение", 2), ...textLines(data.admission), heading("1.4. Программа разработана на основе", 2), ...textLines(basisText(data)), heading(`1.5. Форма обучения – ${data.learningForm}`, 2), heading(`1.6. Формат обучения – ${data.learningFormat}`, 2)];
}

function qualityBlocks(data: ProgramData, type: ProgramType) {
  const plans = studyPlans(data);
  const sectionMap = new Map(data.sectionPrograms.map((section) => [section.planRowId, section]));
  const currentControls = Array.from(new Set((type === "PK" ? data.sectionPrograms.map(sectionProgramControl) : plans.flatMap((plan) => plan.rows).map((row) => (row.currentControl === "Иное" ? row.currentControlOther : row.currentControl))).filter((value) => value && value !== "Не предусмотрен")));
  const interimForms = Array.from(
    new Set(
      plans
        .flatMap((plan) => plan.rows)
        .filter((row) => row.attestation)
        .map((row) => (type === "PK" ? `${sectionMap.get(row.id)?.attestationKind || "Не выбран"}: ${row.attestation}` : row.attestation)),
    ),
  );
  const hasInterim = interimForms.length > 0;
  const formTitle = hasInterim ? "2.4.1. Формы промежуточной и итоговой аттестации" : "2.4.1. Форма итоговой аттестации";
  const summary = !currentControls.length && !hasInterim ? [paragraph("Текущий контроль знаний и промежуточная аттестация не предусмотрены.")] : [paragraph(`Текущий контроль знаний: ${currentControls.length ? currentControls.join(", ") : "не предусмотрен"}.`), paragraph(`Промежуточная аттестация: ${hasInterim ? interimForms.join(", ") : "не предусмотрена"}.`)];
  return [heading("2.4. Оценка качества освоения программы", 2), heading(formTitle, 3), ...summary, ...plans.flatMap((plan) => textLines(`Итоговая аттестация: вид – ${resolvedFinalAssessmentKind(plan) || "не выбран"}; форма оценивания – ${plan.finalAssessmentForm ? plan.finalAssessmentForm.toLowerCase() : "не выбрана"}${plan.finalAssessmentHours ? `; продолжительность – ${formatHours(plan.finalAssessmentHours)} час.` : ""}.`)), heading("2.4.2. Оценочные материалы", 3), ...currentControlBlocks(data, type), ...Object.entries(data.interimMaterials).flatMap(([form, material]) => labeled(form, material)), paragraph("Итоговая аттестация", { bold: true }), ...textLines(data.finalAssessmentMaterials), ...plans.flatMap((plan) => labeled(`Критерии оценки – ${plan.finalAssessmentForm || "форма не выбрана"}`, data.finalCriteria[plan.finalAssessmentForm] || automaticCriteria(plan.finalAssessmentForm)))];
}

function contentBlocks(program: ExportProgram, data: ProgramData, disciplines: ExportDiscipline[]) {
  const plans = studyPlans(data);
  const section23Title = program.type === "PP" ? "2.3. Рабочие программы дисциплин" : "2.3. Рабочие программы разделов";
  const section23 = program.type === "PP" ? [disciplineProgramsTable(disciplines)] : sectionProgramBlocks(data);
  return [
    heading("2. СОДЕРЖАНИЕ ПРОГРАММЫ"),
    heading("2.1. Учебный план", 2),
    ...plans.flatMap((plan) => [
      ...(plans.length > 1
        ? [
            paragraph(plan.title, {
              bold: true,
              compact: true,
              keepNext: true,
              after: 120,
            }),
          ]
        : []),
      planTable(data, program.type, plan),
      ...(plans.length > 1 ? [paragraph(`Общая трудоёмкость варианта: ${formatHours(studyPlanTotal(plan))} час.`, { compact: true })] : []),
    ]),
    heading("2.2. Календарный учебный график", 2),
    ...plans.flatMap((plan) => [
      ...(plans.length > 1
        ? [
            paragraph(plan.title, {
              bold: true,
              compact: true,
              keepNext: true,
              after: 120,
            }),
          ]
        : []),
      scheduleTable(plan),
    ]),
    heading(section23Title, 2, true),
    ...section23,
    ...qualityBlocks(data, program.type),
  ];
}

function conditionsBlocks(data: ProgramData, type: ProgramType) {
  const directReferences = data.referenceItems.filter((item) => item.title.trim() && item.kind !== "electronic").map(formatReference);
  const electronicReferences = data.referenceItems.filter((item) => item.title.trim() && item.kind === "electronic").map(formatReference);
  return [heading(type === "DOOP" ? "3. ОРГАНИЗАЦИОННО-ПЕДАГОГИЧЕСКИЕ УСЛОВИЯ РЕАЛИЗАЦИИ ПРОГРАММЫ" : "3. ОРГАНИЗАЦИОННО-ПЕДАГОГИЧЕСКИЕ УСЛОВИЯ"), heading("3.1. Материально-технические условия", 2), conditionsTable(data.materialRows, "material"), heading("3.2. Учебно-методическое и информационное обеспечение", 2), paragraph("Основная и дополнительная литература", { bold: true }), ...(directReferences.length ? numberedValues(directReferences) : [paragraph("Не указана.")]), paragraph("Электронные ресурсы", { bold: true }), ...(electronicReferences.length ? numberedValues(electronicReferences) : [paragraph("Не указаны.")]), heading(type === "DOOP" ? "3.3. Кадровое обеспечение образовательного процесса" : "3.3. Кадровые условия", 2), ...textLines(data.staffConditions), ...(data.learningFormat !== "очный" ? [heading("3.4. Условия для функционирования электронной информационно-образовательной среды", 2), conditionsTable(data.digitalRows, "digital")] : [])];
}

function closingBlocks(data: ProgramData, type: ProgramType) {
  return type === "DOOP" ? [heading("4. СРЕДСТВА АДАПТАЦИИ ПРОГРАММЫ К ПОТРЕБНОСТЯМ ОБУЧАЮЩИХСЯ С ИНВАЛИДНОСТЬЮ И ОВЗ"), ...textLines(data.accessibility)] : [];
}

export async function buildProgramDocx(program: ExportProgram, data: ProgramData, disciplines: ExportDiscipline[] = []) {
  const children = [...titlePage(program, data), ...generalCharacteristics(data, program.type), ...contentBlocks(program, data, disciplines), ...conditionsBlocks(data, program.type), ...closingBlocks(data, program.type)];
  const pageHeader = new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        indent: { firstLine: 0 },
        spacing: { line: SINGLE_LINE, lineRule: LineRuleType.AUTO, after: 0 },
        children: [
          new TextRun({
            children: [PageNumber.CURRENT],
            font: FONT,
            size: TEXT_SIZE,
            color: "000000",
          }),
        ],
      }),
    ],
  });
  const doc = new Document({
    creator: "Конструктор образовательных программ",
    title: program.title,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: TEXT_SIZE, color: "000000" },
          paragraph: {
            alignment: AlignmentType.JUSTIFIED,
            indent: { firstLine: FIRST_LINE },
            spacing: { line: BODY_LINE, lineRule: LineRuleType.AUTO, after: 0 },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: TEXT_SIZE, bold: true, color: "000000" },
          paragraph: {
            keepNext: true,
            spacing: { line: BODY_LINE, before: 240, after: 120 },
            alignment: AlignmentType.CENTER,
          },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: TEXT_SIZE, bold: true, color: "000000" },
          paragraph: {
            keepNext: true,
            spacing: { line: BODY_LINE, before: 180, after: 120 },
          },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { font: FONT, size: TEXT_SIZE, bold: true, color: "000000" },
          paragraph: {
            keepNext: true,
            spacing: { line: BODY_LINE, before: 180, after: 120 },
          },
        },
      ],
    },
    sections: [
      {
        headers: {
          default: pageHeader,
          first: new Header({ children: [new Paragraph("")] }),
        },
        properties: {
          titlePage: true,
          page: {
            size: {
              width: 11_906,
              height: 16_838,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 1_134,
              right: 567,
              bottom: 1_134,
              left: 1_134,
              header: 567,
              footer: 567,
            },
          },
        },
        children,
      },
    ],
  });
  return Packer.toBuffer(doc);
}

export function exportFileName(program: ExportProgram, data: ProgramData) {
  const prefix = program.type === "PP" ? "ДПП_ПП" : program.type === "PK" ? "ДПП_ПК" : "ДООП";
  const cleanTitle =
    program.title
      .replace(/[\x00-\x1F\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/[._]+$/g, "")
      .slice(0, 70) || "Без_названия";
  const cleanYear =
    String(data.year || new Date().getFullYear())
      .replace(/\D+/g, "")
      .slice(0, 4) || String(new Date().getFullYear());
  return `${prefix}_${cleanTitle}_${cleanYear}.docx`;
}
