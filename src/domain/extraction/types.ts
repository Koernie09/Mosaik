import type { PersonalScheduleDraft } from "../personal-schedule";

export type ExtractionWarning = {
  code:
    | "EMPTY_SOURCE"
    | "UNRECOGNIZED_LINE"
    | "IMAGE_OCR_NOT_AVAILABLE"
    | "PDF_WITHOUT_TEXT"
    | "TOO_MANY_PAGES"
    | "TEACHING_ASSIGNMENT_WITHOUT_TIMES"
    | "HTML_PERIOD_TIMES_MISSING"
    | "HTML_NO_TIMETABLE";
  message: string;
  line?: number;
};

export type ExtractionResult = {
  draft: PersonalScheduleDraft;
  warnings: ExtractionWarning[];
  recognizedLines: number;
  ignoredLines: number;
  sourceText?: string;
};

export type TextSourceType = "text" | "table" | "pdf";
