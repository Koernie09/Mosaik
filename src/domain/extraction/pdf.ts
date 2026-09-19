import { extractScheduleFromText } from "./text";
import type { ExtractionResult } from "./types";

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const MAX_PAGES = 20;

type PositionedText = { text: string; x: number; y: number };

function linesFromItems(items: PositionedText[]): string[] {
  const rows: PositionedText[][] = [];
  for (const item of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) <= 3);
    if (row) row.push(item);
    else rows.push([item]);
  }
  return rows.map((row) => row.sort((a, b) => a.x - b.x).map((item) => item.text).join("\t"));
}

export async function extractScheduleFromPdf(file: File): Promise<ExtractionResult> {
  if (file.size > MAX_PDF_BYTES) throw new Error("Die PDF-Datei darf höchstens 15 MB groß sein.");
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  if (document.numPages > MAX_PAGES) throw new Error(`Die PDF-Datei darf höchstens ${MAX_PAGES} Seiten enthalten.`);
  const lines: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items.flatMap((item) => {
      if (!("str" in item) || !item.str.trim()) return [];
      return [{ text: item.str.trim(), x: item.transform[4], y: item.transform[5] }];
    });
    lines.push(...linesFromItems(items));
  }
  const result = extractScheduleFromText(lines.join("\n"), { sourceType: "pdf", fileName: file.name });
  if (lines.length === 0) {
    result.warnings.push({
      code: "PDF_WITHOUT_TEXT",
      message: "Diese PDF enthält keine lesbare Textebene. Die automatische Bilderkennung ist noch nicht freigegeben; bitte die Stunden manuell ergänzen.",
    });
  }
  return result;
}
