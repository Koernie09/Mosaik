import {
  PERSONAL_SCHEDULE_DRAFT_SCHEMA,
  type DraftLesson,
  type PersonalScheduleDraft,
  type Weekday,
} from "../personal-schedule";
import type { ExtractionResult } from "./types";

type GridCell = { element: Element; originRow: number; rowSpan: number };
type Footnote = { subject?: string; classOrCourse?: string; room?: string };

const weekdays: Record<string, Weekday> = {
  montag: "MO",
  dienstag: "DI",
  mittwoch: "MI",
  donnerstag: "DO",
  freitag: "FR",
  samstag: "SA",
  sonntag: "SO",
};

const months: Record<string, string> = {
  januar: "01", februar: "02", märz: "03", april: "04", mai: "05", juni: "06",
  juli: "07", august: "08", september: "09", oktober: "10", november: "11", dezember: "12",
};

function linesOf(element: Element): string[] {
  const clone = element.cloneNode(true) as Element;
  clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  return (clone.textContent ?? "")
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function tableMatrix(table: Element): GridCell[][] {
  const matrix: GridCell[][] = [];
  const rows = [...table.querySelectorAll(":scope > tbody > tr, :scope > tr")];
  rows.forEach((row, rowIndex) => {
    matrix[rowIndex] ??= [];
    let column = 0;
    [...row.children].filter((cell) => /^(TD|TH)$/i.test(cell.tagName)).forEach((cell) => {
      while (matrix[rowIndex][column]) column += 1;
      const rowSpan = Math.max(1, Number(cell.getAttribute("rowspan") ?? 1));
      const colSpan = Math.max(1, Number(cell.getAttribute("colspan") ?? 1));
      for (let rowOffset = 0; rowOffset < rowSpan; rowOffset += 1) {
        matrix[rowIndex + rowOffset] ??= [];
        for (let columnOffset = 0; columnOffset < colSpan; columnOffset += 1) {
          matrix[rowIndex + rowOffset][column + columnOffset] = { element: cell, originRow: rowIndex, rowSpan };
        }
      }
      column += colSpan;
    });
  });
  return matrix;
}

function footnotesOf(document: Document): Map<string, Footnote> {
  const notes = new Map<string, Footnote>();
  for (const table of [...document.querySelectorAll("table")]) {
    const rows = [...table.querySelectorAll("tr")];
    if (!rows.some((row) => /Le\.,Fa\.,Rm\./i.test(row.textContent ?? ""))) continue;
    for (const row of rows.slice(1)) {
      const cells = [...row.querySelectorAll(":scope > td, :scope > th")];
      const id = linesOf(cells[0] ?? row)[0];
      if (!/^\d+\)$/.test(id ?? "")) continue;
      const details = linesOf(cells[1] ?? row)[0]?.split(",").map((value) => value.trim()) ?? [];
      notes.set(id, {
        subject: details[1],
        room: details[2],
        classOrCourse: linesOf(cells[2] ?? row)[0]?.replace(/\s*,\s*/g, ", "),
      });
    }
  }
  return notes;
}

function timetableOf(document: Document): { matrix: GridCell[][]; days: Map<number, Weekday> } | null {
  for (const table of [...document.querySelectorAll("table")]) {
    const matrix = tableMatrix(table);
    const days = new Map<number, Weekday>();
    (matrix[0] ?? []).forEach((cell, column) => {
      const day = weekdays[linesOf(cell.element).join(" ").toLocaleLowerCase("de-DE")];
      if (day) days.set(column, day);
    });
    if (days.size >= 2) return { matrix, days };
  }
  return null;
}

function validityFrom(document: Document): { from: string } | undefined {
  const text = document.body?.textContent?.replace(/\s+/g, " ") ?? "";
  const match = text.match(/gilt\s+ab\s+\w+\s*;\s*(\d{1,2})\.\s*([A-Za-zÄÖÜäöüß]+)\s+(\d{4})/i);
  if (!match) return undefined;
  const month = months[match[2].toLocaleLowerCase("de-DE")];
  return month ? { from: `${match[3]}-${month}-${match[1].padStart(2, "0")}` } : undefined;
}

function lessonFromCell(cell: GridCell, weekday: Weekday, period: string, notes: Map<string, Footnote>): DraftLesson | null {
  const lines = linesOf(cell.element);
  if (lines.length === 0) return null;
  const note = lines.map((line) => notes.get(line)).find(Boolean);
  const subject = note?.subject ?? lines[0];
  const periodEnd = Number(period) + cell.rowSpan - 1;
  const periodLabel = cell.rowSpan > 1 ? `${period}–${periodEnd}` : period;
  const ordinaryValues = lines.slice(1).filter((line) => !/^\d+\)$/.test(line));
  const classOrCourse = note?.classOrCourse ?? ordinaryValues[0];
  const room = note?.room ?? ordinaryValues[1];
  return {
    id: crypto.randomUUID(),
    weekday,
    startTime: null,
    endTime: null,
    period: periodLabel,
    subject,
    classOrCourse: classOrCourse || null,
    room: room || null,
    confidence: {
      overall: note ? 0.82 : 0.88,
      fields: { weekday: 0.98, period: 0.98, subject: 0.9, classOrCourse: 0.78, room: 0.75 },
    },
    evidence: { page: 1, rawText: lines.join(" | ") },
    warnings: [
      { field: "startTime", code: "missing-start-time", message: "Beginn für diese Stundennummer ergänzen." },
      { field: "endTime", code: "missing-end-time", message: "Ende für diese Stundennummer ergänzen." },
    ],
  };
}

export function extractScheduleFromHtml(html: string, fileName?: string): ExtractionResult {
  const document = new DOMParser().parseFromString(html, "text/html");
  const timetable = timetableOf(document);
  const now = new Date().toISOString();
  const sourceText = document.body?.textContent?.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim() ?? "";
  const lessons: DraftLesson[] = [];
  if (timetable) {
    const notes = footnotesOf(document);
    for (let rowIndex = 1; rowIndex < timetable.matrix.length; rowIndex += 1) {
      const periodCell = timetable.matrix[rowIndex]?.[0];
      const period = periodCell ? linesOf(periodCell.element)[0] : undefined;
      if (!period || !/^\d+$/.test(period)) continue;
      for (const [column, weekday] of timetable.days) {
        const cell = timetable.matrix[rowIndex]?.[column];
        if (!cell || cell.originRow !== rowIndex) continue;
        const lesson = lessonFromCell(cell, weekday, period, notes);
        if (lesson) lessons.push(lesson);
      }
    }
  }

  const draft: PersonalScheduleDraft = {
    schema: PERSONAL_SCHEDULE_DRAFT_SCHEMA,
    draftId: crypto.randomUUID(),
    status: "extracted",
    createdAt: now,
    validity: validityFrom(document),
    timezone: "Europe/Berlin",
    source: { type: "html", fileName, importedAt: now },
    lessons: lessons.length > 0 ? lessons : [{
      id: crypto.randomUUID(), weekday: null, startTime: null, endTime: null,
      subject: null, classOrCourse: null, room: null,
      warnings: [{ code: "manual-entry", message: "Unterrichtsstunde ergänzen." }],
    }],
  };

  return {
    draft,
    warnings: lessons.length > 0 ? [{
      code: "HTML_PERIOD_TIMES_MISSING",
      message: `Alter UNTIS-Stundenplan erkannt: ${lessons.length} Einträge mit Wochentag und Stundennummer. Das Dokument enthält keine Uhrzeiten; bitte ergänze Beginn und Ende.`,
    }] : [{
      code: "HTML_NO_TIMETABLE",
      message: "In der HTML-Datei wurde kein Stundenplanraster erkannt. Bitte die Stunden manuell ergänzen.",
    }],
    recognizedLines: lessons.length,
    ignoredLines: 0,
    sourceText,
  };
}

export async function decodeHtmlFile(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const header = new TextDecoder("windows-1252").decode(bytes.slice(0, 2048));
  const charset = header.match(/charset\s*=\s*["']?([^\s"';>]+)/i)?.[1]?.toLowerCase();
  const encoding = charset === "iso-8859-1" || charset === "latin1" ? "windows-1252" : (charset ?? "utf-8");
  try {
    return new TextDecoder(encoding).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}
