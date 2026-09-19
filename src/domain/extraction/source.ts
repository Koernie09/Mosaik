import { PERSONAL_SCHEDULE_DRAFT_SCHEMA, type PersonalScheduleDraft } from "../personal-schedule";
import { emptyLesson, extractScheduleFromText } from "./text";
import { extractScheduleFromPdf } from "./pdf";
import type { ExtractionResult } from "./types";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export async function extractScheduleFromFile(file: File): Promise<ExtractionResult> {
  const type = file.type.toLowerCase();
  if (type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return extractScheduleFromPdf(file);
  }
  if (type.startsWith("text/") || /\.(csv|tsv|txt)$/i.test(file.name)) {
    return extractScheduleFromText(await file.text(), {
      sourceType: file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".tsv") ? "table" : "text",
      fileName: file.name,
    });
  }
  if (type.startsWith("image/") || /\.(png|jpe?g|webp|heic)$/i.test(file.name)) {
    if (file.size > MAX_IMAGE_BYTES) throw new Error("Das Bild darf höchstens 15 MB groß sein.");
    const now = new Date().toISOString();
    const draft: PersonalScheduleDraft = {
      schema: PERSONAL_SCHEDULE_DRAFT_SCHEMA,
      draftId: crypto.randomUUID(),
      status: "extracted",
      createdAt: now,
      timezone: "Europe/Berlin",
      source: { type: "image", fileName: file.name, importedAt: now },
      lessons: [emptyLesson()],
    };
    return {
      draft,
      warnings: [{
        code: "IMAGE_OCR_NOT_AVAILABLE",
        message: "Die automatische Fotoerkennung ist noch nicht freigegeben. Das Bild bleibt auf diesem Gerät. Bitte übertrage die Stunden vorerst manuell.",
      }],
      recognizedLines: 0,
      ignoredLines: 0,
    };
  }
  throw new Error("Unterstützt werden PDF, Bild, Text, CSV und TSV.");
}
