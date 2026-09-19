import { useEffect, useState } from "react";
import { HandoffStep } from "./components/HandoffStep";
import { ImportStep } from "./components/ImportStep";
import { ReviewStep, type SourcePreview } from "./components/ReviewStep";
import { StepNav, type WorkflowStep } from "./components/StepNav";
import {
  createManualScheduleDraft,
  extractScheduleFromFile,
  extractScheduleFromText,
  type ExtractionWarning,
} from "./domain/extraction";
import {
  confirmScheduleDraft,
  createAtlasHandoff,
  ScheduleConfirmationError,
  type AtlasHandoff,
  type PersonalScheduleDraft,
  type ScheduleIssue,
} from "./domain/personal-schedule";
import { openAtlasWithHandoff } from "./lib/atlas-handoff";

export function App() {
  const [step, setStep] = useState<WorkflowStep>("import");
  const [draft, setDraft] = useState<PersonalScheduleDraft | null>(null);
  const [handoff, setHandoff] = useState<AtlasHandoff | null>(null);
  const [warnings, setWarnings] = useState<ExtractionWarning[]>([]);
  const [issues, setIssues] = useState<ScheduleIssue[]>([]);
  const [preview, setPreview] = useState<SourcePreview | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
  }, [preview]);

  function beginReview(
    nextDraft: PersonalScheduleDraft,
    nextWarnings: ExtractionWarning[] = [],
    nextPreview: SourcePreview | null = null,
  ) {
    setDraft(nextDraft);
    setWarnings(nextWarnings);
    setPreview(nextPreview);
    setIssues([]);
    setHandoff(null);
    setStatus("");
    setStep("review");
  }

  async function importFile(file: File) {
    setBusy(true);
    setStatus("Die Datei wird ausschließlich auf diesem Gerät verarbeitet …");
    try {
      const result = await extractScheduleFromFile(file);
      const isImage = result.draft.source.type === "image";
      const isPdf = result.draft.source.type === "pdf";
      const nextPreview: SourcePreview = isImage || isPdf
        ? {
            kind: isImage ? "image" : "pdf",
            fileName: file.name,
            url: URL.createObjectURL(file),
          }
        : {
            kind: "text",
            fileName: file.name,
            text: result.sourceText ?? await file.text(),
          };
      beginReview(result.draft, result.warnings, nextPreview);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Die Datei konnte nicht verarbeitet werden.");
    } finally {
      setBusy(false);
    }
  }

  function importText(text: string) {
    const result = extractScheduleFromText(text, { sourceType: "table" });
    beginReview(result.draft, result.warnings, { kind: "text", text });
  }

  function beginManualEntry() {
    beginReview(createManualScheduleDraft());
  }

  function changeDraft(nextDraft: PersonalScheduleDraft) {
    setDraft(nextDraft);
    setIssues([]);
    setHandoff(null);
    setStatus("");
  }

  function confirmDraft() {
    if (!draft) return;
    try {
      const confirmed = confirmScheduleDraft({ ...draft, status: "reviewed" });
      setHandoff(createAtlasHandoff(confirmed));
      setIssues([]);
      setStatus("Der Stundenplan ist bestätigt und zur Übergabe bereit.");
      setStep("handoff");
    } catch (error) {
      if (error instanceof ScheduleConfirmationError) {
        setIssues(error.issues);
        setStatus("Bitte korrigiere die markierten Angaben, bevor Du den Stundenplan bestätigst.");
      } else {
        setStatus("Der Entwurf ist unvollständig und kann noch nicht bestätigt werden.");
      }
    }
  }

  function openAtlas() {
    if (!handoff) return;
    if (openAtlasWithHandoff(handoff)) {
      setStatus("ATLAS wurde geöffnet. Prüfe und bestätige den Import dort noch einmal.");
    } else {
      setStatus("ATLAS konnte nicht geöffnet werden. Erlaube Pop-ups oder lade die Übergabedatei herunter.");
    }
  }

  function returnToImport() {
    if (!window.confirm("Zurück zum Import? Nicht bestätigte Änderungen am Entwurf gehen dabei verloren.")) return;
    setStep("import");
    setDraft(null);
    setHandoff(null);
    setWarnings([]);
    setIssues([]);
    setPreview(null);
    setStatus("");
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">MOSAIK</p>
          <h1>Persönlichen Stundenplan übernehmen</h1>
          <p className="intro">
            Importiere, prüfe und bestätige Deinen Wochenstundenplan. Erst danach kann ATLAS ihn übernehmen.
          </p>
        </div>
        <p className="privacy-badge">Lokal verarbeitet · keine externe OCR</p>
      </header>

      <StepNav current={step} />

      {step === "import" ? (
        <ImportStep busy={busy} onFile={importFile} onManual={beginManualEntry} onText={importText} />
      ) : null}

      {step === "review" && draft ? (
        <ReviewStep
          draft={draft}
          issues={issues}
          preview={preview}
          warnings={warnings}
          onBack={returnToImport}
          onChange={changeDraft}
          onConfirm={confirmDraft}
        />
      ) : null}

      {step === "handoff" && handoff ? (
        <HandoffStep handoff={handoff} onBack={() => setStep("review")} onOpenAtlas={openAtlas} />
      ) : null}

      {status ? <p className="global-status" role="status">{status}</p> : null}
      <footer>
        Fotos, PDFs und eingefügter Text verlassen MOSAIK nicht. ATLAS erhält ausschließlich bestätigte Stundenplan-Tatsachen.
      </footer>
    </main>
  );
}
