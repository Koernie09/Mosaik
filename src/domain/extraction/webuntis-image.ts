import { OEM, PSM, createWorker } from "tesseract.js";
import {
  PERSONAL_SCHEDULE_DRAFT_SCHEMA,
  type DraftLesson,
  type PersonalScheduleDraft,
  type Weekday,
} from "../personal-schedule";
import type { ExtractionResult, ExtractionWarning } from "./types";

type OcrWord = {
  text: string;
  confidence: number;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type WebUntisVisionInput = {
  width: number;
  height: number;
  words: OcrWord[];
  axisWords?: OcrWord[];
  isWhite: (x: number, y: number) => boolean;
  fileName?: string;
};

const days: Weekday[] = ["MO", "DI", "MI", "DO", "FR"];
const timePattern = /^([01]?\d|2[0-3]):[0-5]\d$/;

function parseTsv(tsv: string, offsetTop = 0): OcrWord[] {
  return tsv.split("\n").slice(1).flatMap((row) => {
    const parts = row.split("\t");
    if (parts.length < 12 || parts[0] !== "5" || !parts[11]?.trim()) return [];
    return [{
      text: parts[11].trim(),
      confidence: Number(parts[10]),
      left: Number(parts[6]),
      top: Number(parts[7]) + offsetTop,
      width: Number(parts[8]),
      height: Number(parts[9]),
    }];
  });
}

function centerY(word: OcrWord) {
  return word.top + word.height / 2;
}

function centersFromHeader(words: OcrWord[], firstTimeY: number, width: number, height: number): number[] {
  const candidates = words
    .filter((word) => /^([1-9]|[12]\d|3[01])$/.test(word.text))
    .filter((word) => word.left > width * 0.08 && centerY(word) > height * 0.12 && centerY(word) < firstTimeY - height * 0.02)
    .sort((a, b) => a.left - b.left);
  if (candidates.length < 5) return [];

  for (let start = 0; start <= candidates.length - 5; start += 1) {
    const group = candidates.slice(start, start + 5);
    const distances = group.slice(1).map((word, index) => word.left - group[index].left);
    const average = distances.reduce((sum, value) => sum + value, 0) / distances.length;
    if (distances.every((value) => Math.abs(value - average) < average * 0.2)) {
      return group.map((word) => word.left + word.width / 2);
    }
  }
  return [];
}

function timeMarks(words: OcrWord[], width: number, height: number): OcrWord[] {
  const candidates = words
    .filter((word) => word.left < width * 0.08 && centerY(word) > height * 0.18 && timePattern.test(word.text))
    .sort((a, b) => centerY(a) - centerY(b));
  const marks: OcrWord[] = [];
  for (const candidate of candidates) {
    const duplicate = marks.findIndex((mark) => Math.abs(centerY(mark) - centerY(candidate)) < 10);
    if (duplicate < 0) marks.push(candidate);
    else if (marks[duplicate].confidence < candidate.confidence) marks[duplicate] = candidate;
  }
  return marks.sort((a, b) => centerY(a) - centerY(b));
}

function laneBounds(centers: number[], day: number, width: number): [number, number] {
  const averageGap = (centers.at(-1)! - centers[0]) / 4;
  const left = day === 0 ? Math.max(width * 0.03, centers[0] - averageGap / 2) : (centers[day - 1] + centers[day]) / 2;
  const right = day === 4 ? Math.min(width - 1, centers[4] + averageGap / 2) : (centers[day] + centers[day + 1]) / 2;
  return [left, right];
}

function whiteRuns(
  input: WebUntisVisionInput,
  left: number,
  right: number,
  top: number,
  bottom: number,
): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  const positions = [0.3, 0.45, 0.6, 0.75, 0.9].map((factor) => Math.round(left + (right - left) * factor));
  let start: number | null = null;
  for (let y = Math.max(0, Math.round(top)); y <= Math.min(input.height - 1, Math.round(bottom)); y += 1) {
    const white = positions.filter((x) => input.isWhite(x, y)).length >= 4;
    if (white && start === null) start = y;
    if (!white && start !== null) {
      if (y - start >= input.height * 0.035) runs.push([start, y - 1]);
      start = null;
    }
  }
  if (start !== null && bottom - start >= input.height * 0.035) runs.push([start, Math.round(bottom)]);
  return runs;
}

function linesInCard(words: OcrWord[], left: number, right: number, top: number, bottom: number, height: number): string[] {
  const relevant = words
    .filter((word) => word.confidence >= 20)
    .filter((word) => word.left + word.width / 2 > left && word.left + word.width / 2 < right)
    .filter((word) => centerY(word) > top && centerY(word) < bottom)
    .sort((a, b) => centerY(a) - centerY(b) || a.left - b.left);
  const lines: Array<{ y: number; words: OcrWord[] }> = [];
  for (const word of relevant) {
    const line = lines.find((candidate) => Math.abs(candidate.y - centerY(word)) <= height * 0.009);
    if (line) {
      line.words.push(word);
      line.y = line.words.reduce((sum, item) => sum + centerY(item), 0) / line.words.length;
    } else {
      lines.push({ y: centerY(word), words: [word] });
    }
  }
  return lines.sort((a, b) => a.y - b.y).map((line) =>
    line.words.sort((a, b) => a.left - b.left).map((word) => word.text).join(" ").trim(),
  ).filter(Boolean);
}

function normalizeRoom(value?: string): string | null {
  if (!value) return null;
  return value.replace(/^([A-Z])O(?=\.\d)/, (_match, prefix: string) => `${prefix}0`).replace(/[.,;]$/, "");
}

function normalizeSubject(value: string): string {
  return value.replace(/(?<=\w)[.,;]$/, "");
}

function nearestMark(marks: OcrWord[], y: number): { mark: OcrWord; index: number } {
  let index = 0;
  for (let candidate = 1; candidate < marks.length; candidate += 1) {
    if (Math.abs(centerY(marks[candidate]) - y) < Math.abs(centerY(marks[index]) - y)) index = candidate;
  }
  return { mark: marks[index], index };
}

export function extractWebUntisFromVision(input: WebUntisVisionInput): ExtractionResult | null {
  const marks = timeMarks([...(input.axisWords ?? []), ...input.words], input.width, input.height);
  if (marks.length !== 14) return null;
  const centers = centersFromHeader(input.words, centerY(marks[0]), input.width, input.height);
  if (centers.length !== 5) return null;

  const lessons: DraftLesson[] = [];
  const unclear: string[] = [];
  for (let day = 0; day < 5; day += 1) {
    const [left, right] = laneBounds(centers, day, input.width);
    const runs = whiteRuns(input, left, right, centerY(marks[0]) - input.height * 0.02, centerY(marks.at(-1)!) + input.height * 0.03);
    for (const [top, bottom] of runs) {
      const lines = linesInCard(input.words, left, right, top, bottom, input.height);
      if (lines.length < 2) {
        if (lines[0]) unclear.push(`${days[day]}: ${lines.join(" / ")}`);
        continue;
      }
      const start = nearestMark(marks, top);
      const end = nearestMark(marks, bottom);
      if (start.index % 2 !== 0 || end.index % 2 !== 1 || end.index <= start.index) {
        unclear.push(`${days[day]}: ${lines.join(" / ")}`);
        continue;
      }
      const startPeriod = start.index / 2;
      const endPeriod = (end.index - 1) / 2;
      const subject = normalizeSubject(lines[1]);
      lessons.push({
        id: crypto.randomUUID(),
        weekday: days[day],
        startTime: start.mark.text.padStart(5, "0"),
        endTime: end.mark.text.padStart(5, "0"),
        period: startPeriod === endPeriod ? String(startPeriod) : `${startPeriod}–${endPeriod}`,
        subject,
        classOrCourse: lines[0],
        room: normalizeRoom(lines[2]),
        confidence: {
          overall: 0.78,
          fields: { weekday: 0.93, startTime: 0.88, endTime: 0.88, period: 0.9, subject: 0.76, classOrCourse: 0.76, room: 0.72 },
        },
        evidence: { page: 1, rawText: lines.join(" | ") },
        warnings: [
          { field: "subject", code: "check-local-ocr", message: "Lokal aus dem WebUntis-Screenshot erkannt; bitte mit dem Bild vergleichen." },
          { field: "classOrCourse", code: "check-local-ocr", message: "Lokal aus dem WebUntis-Screenshot erkannt; bitte mit dem Bild vergleichen." },
          ...(lines[2] ? [{ field: "room" as const, code: "check-local-ocr", message: "Lokal aus dem WebUntis-Screenshot erkannt; bitte mit dem Bild vergleichen." }] : []),
        ],
      });
    }
  }
  if (lessons.length === 0) return null;

  const now = new Date().toISOString();
  const draft: PersonalScheduleDraft = {
    schema: PERSONAL_SCHEDULE_DRAFT_SCHEMA,
    draftId: crypto.randomUUID(),
    status: "extracted",
    createdAt: now,
    timezone: "Europe/Berlin",
    source: { type: "image", fileName: input.fileName, importedAt: now },
    lessons,
  };
  const warnings: ExtractionWarning[] = [{
    code: "WEBUNTIS_SCREENSHOT_RECOGNIZED",
    message: `WebUntis-Screenshot lokal erkannt: ${lessons.length} Unterrichtsblöcke. Bitte alle Angaben mit dem Bild vergleichen.`,
  }];
  if (unclear.length > 0) warnings.push({
    code: "WEBUNTIS_UNCLEAR_ENTRIES",
    message: `${unclear.length} weiterer Planeintrag wurde nicht als Unterricht übernommen (${unclear.join(", ")}). Bitte prüfe ihn im Screenshot.`,
  });
  return { draft, warnings, recognizedLines: lessons.length, ignoredLines: unclear.length };
}

function loadCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return reject(new Error("Das Bild konnte nicht lokal gelesen werden."));
      context.drawImage(image, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Das Bildformat konnte nicht lokal gelesen werden."));
    };
    image.src = url;
  });
}

export async function extractWebUntisScreenshot(file: File): Promise<ExtractionResult | null> {
  if (typeof document === "undefined") return null;
  const signature = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const isPng = signature[0] === 0x89 && signature[1] === 0x50 && signature[2] === 0x4e && signature[3] === 0x47;
  const isJpeg = signature[0] === 0xff && signature[1] === 0xd8;
  const isWebp = String.fromCharCode(...signature.slice(0, 4)) === "RIFF" && String.fromCharCode(...signature.slice(8, 12)) === "WEBP";
  const isHeic = String.fromCharCode(...signature.slice(4, 8)) === "ftyp";
  if (!isPng && !isJpeg && !isWebp && !isHeic) return null;
  let canvas: HTMLCanvasElement;
  try {
    canvas = await loadCanvas(file);
  } catch {
    return null;
  }
  if (canvas.width / canvas.height < 1.25 || canvas.width < 900) return null;

  const base = import.meta.env.BASE_URL;
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    workerPath: `${base}ocr/worker.min.js`,
    corePath: `${base}ocr/`,
    langPath: `${base}ocr/`,
  });
  try {
    await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
    const full = await worker.recognize(canvas, {}, { tsv: true });
    const words = parseTsv(full.data.tsv ?? "");
    if (!words.some((word) => /stundenplan/i.test(word.text))) return null;

    const scheduleTop = Math.round(canvas.height * 0.2);
    const axis = document.createElement("canvas");
    axis.width = Math.max(90, Math.round(canvas.width * 0.055));
    axis.height = canvas.height - scheduleTop;
    axis.getContext("2d")?.drawImage(canvas, 0, scheduleTop, axis.width, axis.height, 0, 0, axis.width, axis.height);
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      tessedit_char_whitelist: "0123456789:",
    });
    const times = await worker.recognize(axis, {}, { tsv: true });
    const pixels = canvas.getContext("2d", { willReadFrequently: true })?.getImageData(0, 0, canvas.width, canvas.height);
    if (!pixels) return null;
    return extractWebUntisFromVision({
      width: canvas.width,
      height: canvas.height,
      words,
      axisWords: parseTsv(times.data.tsv ?? "", scheduleTop),
      fileName: file.name,
      isWhite: (x, y) => {
        const offset = (Math.round(y) * pixels.width + Math.round(x)) * 4;
        return pixels.data[offset] >= 250 && pixels.data[offset + 1] >= 250 && pixels.data[offset + 2] >= 250;
      },
    });
  } finally {
    await worker.terminate();
  }
}
