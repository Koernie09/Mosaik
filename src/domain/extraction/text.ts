import {
  PERSONAL_SCHEDULE_DRAFT_SCHEMA,
  type DraftLesson,
  type PersonalScheduleDraft,
  type Weekday,
} from "../personal-schedule";
import type { ExtractionResult, ExtractionWarning, TextSourceType } from "./types";

const weekdayAliases: Array<[RegExp, Weekday]> = [
  [/^(mo|montag)\.?$/i, "MO"],
  [/^(di|dienstag)\.?$/i, "DI"],
  [/^(mi|mittwoch)\.?$/i, "MI"],
  [/^(do|donnerstag)\.?$/i, "DO"],
  [/^(fr|freitag)\.?$/i, "FR"],
  [/^(sa|samstag)\.?$/i, "SA"],
  [/^(so|sonntag)\.?$/i, "SO"],
];

const timeToken = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g;

function weekdayOf(value: string): Weekday | null {
  const normalized = value.trim();
  return weekdayAliases.find(([pattern]) => pattern.test(normalized))?.[1] ?? null;
}

function timeOf(value: string): string | null {
  const match = [...value.matchAll(timeToken)][0];
  return match ? `${match[1].padStart(2, "0")}:${match[2]}` : null;
}

function timesOf(value: string): string[] {
  return [...value.matchAll(timeToken)].map((match) => `${match[1].padStart(2, "0")}:${match[2]}`);
}

function columns(line: string): string[] {
  const structured = line.split(/\t|;|\||\s{2,}/).map((part) => part.trim()).filter(Boolean);
  return structured.length > 1 ? structured : line.trim().split(/\s+/);
}

function contentFields(parts: string[]): Pick<DraftLesson, "subject" | "classOrCourse" | "room"> {
  const cleaned = parts.map((part) => part.trim()).filter(Boolean);
  return {
    subject: cleaned[0] ?? null,
    classOrCourse: cleaned[1] ?? null,
    room: cleaned[2] ?? null,
  };
}

function lesson(input: {
  weekday: Weekday;
  startTime: string;
  endTime: string;
  content: string[];
  rawText: string;
  line: number;
}): DraftLesson {
  const fields = contentFields(input.content);
  return {
    id: crypto.randomUUID(),
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    ...fields,
    confidence: {
      overall: fields.subject ? 0.78 : 0.45,
      fields: { weekday: 0.98, startTime: 0.92, endTime: 0.92, subject: fields.subject ? 0.7 : 0.2 },
    },
    evidence: { page: 1, rawText: input.rawText },
    warnings: fields.subject
      ? []
      : [{ field: "subject", code: "missing-subject", message: `Zeile ${input.line}: Fach ergänzen.` }],
  };
}

function parseRows(lines: string[]): { lessons: DraftLesson[]; used: Set<number> } {
  const lessons: DraftLesson[] = [];
  const used = new Set<number>();
  lines.forEach((line, index) => {
    const parts = columns(line);
    const weekdayIndex = parts.findIndex((part) => weekdayOf(part) !== null);
    const times = timesOf(line);
    if (weekdayIndex < 0 || times.length < 2) return;
    const day = weekdayOf(parts[weekdayIndex]);
    if (!day) return;
    const content = parts.filter((part, partIndex) =>
      partIndex !== weekdayIndex && timesOf(part).length === 0,
    );
    lessons.push(lesson({
      weekday: day,
      startTime: times[0],
      endTime: times[1],
      content,
      rawText: line,
      line: index + 1,
    }));
    used.add(index);
  });
  return { lessons, used };
}

function parseGrid(lines: string[], alreadyUsed: Set<number>): { lessons: DraftLesson[]; used: Set<number> } {
  const lessons: DraftLesson[] = [];
  const used = new Set<number>();
  const headerIndex = lines.findIndex((line, index) =>
    !alreadyUsed.has(index) && columns(line).filter((part) => weekdayOf(part)).length >= 2,
  );
  if (headerIndex < 0) return { lessons, used };
  const header = columns(lines[headerIndex]);
  const dayColumns = header.map((part, index) => ({ day: weekdayOf(part), index })).filter((item) => item.day);
  used.add(headerIndex);

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    if (alreadyUsed.has(index)) continue;
    const parts = columns(lines[index]);
    const times = timesOf(lines[index]);
    if (times.length < 2) continue;
    for (const dayColumn of dayColumns) {
      const offset = parts.length === header.length + 1 ? 1 : 0;
      const cell = parts[dayColumn.index + offset];
      if (!cell || timesOf(cell).length > 0 || /^[-–—/]$/.test(cell)) continue;
      lessons.push(lesson({
        weekday: dayColumn.day!,
        startTime: times[0],
        endTime: times[1],
        content: cell.split(/\s*\/\s*|\s{2,}|,/),
        rawText: lines[index],
        line: index + 1,
      }));
    }
    used.add(index);
  }
  return { lessons, used };
}

function source(type: TextSourceType, fileName?: string) {
  return { type, fileName, importedAt: new Date().toISOString() } as const;
}

export function extractScheduleFromText(
  text: string,
  options: { sourceType?: TextSourceType; fileName?: string; timezone?: string } = {},
): ExtractionResult {
  const lines = text.replace(/\r/g, "").split("\n").map((line) => line.trim()).filter(Boolean);
  const rowResult = parseRows(lines);
  const gridResult = parseGrid(lines, rowResult.used);
  const lessons = [...rowResult.lessons, ...gridResult.lessons];
  const used = new Set([...rowResult.used, ...gridResult.used]);
  const warnings: ExtractionWarning[] = [];
  if (lines.length === 0) warnings.push({ code: "EMPTY_SOURCE", message: "Die Eingabe enthält keinen Text." });
  lines.forEach((line, index) => {
    if (!used.has(index) && !columns(line).some((part) => weekdayOf(part))) {
      warnings.push({ code: "UNRECOGNIZED_LINE", message: `Zeile ${index + 1} wurde nicht erkannt: ${line}`, line: index + 1 });
    }
  });

  const draft: PersonalScheduleDraft = {
    schema: PERSONAL_SCHEDULE_DRAFT_SCHEMA,
    draftId: crypto.randomUUID(),
    status: "extracted",
    createdAt: new Date().toISOString(),
    timezone: options.timezone ?? "Europe/Berlin",
    source: source(options.sourceType ?? "text", options.fileName),
    lessons: lessons.length > 0 ? lessons : [emptyLesson()],
  };
  return { draft, warnings, recognizedLines: used.size, ignoredLines: lines.length - used.size };
}

export function emptyLesson(): DraftLesson {
  return {
    id: crypto.randomUUID(),
    weekday: null,
    startTime: null,
    endTime: null,
    subject: null,
    classOrCourse: null,
    room: null,
    warnings: [{ code: "manual-entry", message: "Unterrichtsstunde ergänzen." }],
  };
}

export function createManualScheduleDraft(timezone = "Europe/Berlin"): PersonalScheduleDraft {
  const now = new Date().toISOString();
  return {
    schema: PERSONAL_SCHEDULE_DRAFT_SCHEMA,
    draftId: crypto.randomUUID(),
    status: "extracted",
    createdAt: now,
    timezone,
    source: { type: "manual", importedAt: now },
    lessons: [emptyLesson()],
  };
}
