import { useMemo, useState } from "react";
import { emptyLesson, type ExtractionWarning } from "../domain/extraction";
import type { DraftLesson, PersonalScheduleDraft, ScheduleIssue, Weekday } from "../domain/personal-schedule";

export type SourcePreview = {
  kind: "image" | "pdf" | "text";
  fileName?: string;
  text?: string;
  url?: string;
};

type EditableField = "weekday" | "startTime" | "endTime" | "period" | "subject" | "classOrCourse" | "room";

const days: Array<{ key: Weekday; label: string }> = [
  { key: "MO", label: "Montag" },
  { key: "DI", label: "Dienstag" },
  { key: "MI", label: "Mittwoch" },
  { key: "DO", label: "Donnerstag" },
  { key: "FR", label: "Freitag" },
  { key: "SA", label: "Samstag" },
  { key: "SO", label: "Sonntag" },
];

type Props = {
  draft: PersonalScheduleDraft;
  issues: ScheduleIssue[];
  preview: SourcePreview | null;
  warnings: ExtractionWarning[];
  onBack: () => void;
  onChange: (draft: PersonalScheduleDraft) => void;
  onConfirm: () => void;
};

function confidenceWarning(lesson: DraftLesson, field: EditableField): string | undefined {
  const warning = lesson.warnings.find((item) => item.field === field);
  if (warning) return warning.message;
  const confidence = lesson.confidence?.fields[field];
  if (confidence !== undefined && confidence < 0.6) return "Diese Angabe wurde unsicher erkannt.";
  return undefined;
}

function Source({ preview }: { preview: SourcePreview }) {
  if (preview.kind === "image" && preview.url) {
    return <img className="source-image" src={preview.url} alt={`Originalquelle ${preview.fileName ?? "Stundenplan"}`} />;
  }
  if (preview.kind === "pdf" && preview.url) {
    return <object className="source-pdf" data={preview.url} type="application/pdf" aria-label={`Originalquelle ${preview.fileName ?? "PDF"}`} />;
  }
  return <pre className="source-text">{preview.text}</pre>;
}

export function ReviewStep({ draft, issues, preview, warnings, onBack, onChange, onConfirm }: Props) {
  const [showSource, setShowSource] = useState(Boolean(preview));
  const lessonsByDay = useMemo(() => new Map(days.map(({ key }) => [
    key,
    draft.lessons.filter((lesson) => lesson.weekday === key),
  ])), [draft.lessons]);
  const unassigned = draft.lessons.filter((lesson) => lesson.weekday === null);

  function updateLesson(id: string, field: EditableField, rawValue: string) {
    const value = rawValue.trim() === "" ? null : rawValue;
    onChange({
      ...draft,
      status: "reviewed",
      lessons: draft.lessons.map((lesson) => {
        if (lesson.id !== id) return lesson;
        const fields = lesson.confidence?.fields ? { ...lesson.confidence.fields, [field]: undefined } : undefined;
        return {
          ...lesson,
          [field]: value,
          confidence: lesson.confidence ? { ...lesson.confidence, fields: fields ?? {} } : undefined,
          warnings: lesson.warnings.filter((warning) => warning.field !== field),
        };
      }),
    });
  }

  function addLesson(weekday: Weekday | null) {
    onChange({ ...draft, status: "reviewed", lessons: [...draft.lessons, { ...emptyLesson(), weekday }] });
  }

  function removeLesson(id: string) {
    const remaining = draft.lessons.filter((lesson) => lesson.id !== id);
    onChange({ ...draft, status: "reviewed", lessons: remaining.length > 0 ? remaining : [emptyLesson()] });
  }

  function changeValidity(field: "from" | "to", value: string) {
    onChange({ ...draft, validity: { ...draft.validity, [field]: value || undefined } });
  }

  function lessonIssues(id: string) {
    return issues.filter((issue) => issue.lessonIds?.includes(id));
  }

  function renderLesson(lesson: DraftLesson, index: number) {
    const relevantIssues = lessonIssues(lesson.id);
    return (
      <article className={`lesson-card ${relevantIssues.length ? "has-error" : ""}`} key={lesson.id}>
        <div className="lesson-title">
          <strong>Unterrichtsstunde {index + 1}</strong>
          <button className="text-button danger" type="button" onClick={() => removeLesson(lesson.id)}>Löschen</button>
        </div>
        <div className="field-grid">
          <label>
            Wochentag <span aria-hidden="true">*</span>
            <select value={lesson.weekday ?? ""} onChange={(event) => updateLesson(lesson.id, "weekday", event.target.value)}>
              <option value="">Bitte wählen</option>
              {days.map((day) => <option value={day.key} key={day.key}>{day.label}</option>)}
            </select>
          </label>
          <label>
            Beginn <span aria-hidden="true">*</span>
            <input type="time" value={lesson.startTime ?? ""} onChange={(event) => updateLesson(lesson.id, "startTime", event.target.value)} />
          </label>
          <label>
            Ende <span aria-hidden="true">*</span>
            <input type="time" value={lesson.endTime ?? ""} onChange={(event) => updateLesson(lesson.id, "endTime", event.target.value)} />
          </label>
          <label>
            Stunde
            <input value={lesson.period ?? ""} onChange={(event) => updateLesson(lesson.id, "period", event.target.value)} />
          </label>
          <Field label="Fach" required lesson={lesson} field="subject" onChange={updateLesson} />
          <Field label="Lerngruppe / Klasse" lesson={lesson} field="classOrCourse" onChange={updateLesson} />
          <Field label="Raum" lesson={lesson} field="room" onChange={updateLesson} />
        </div>
        {relevantIssues.map((issue) => <p className="field-error" key={`${issue.code}-${issue.message}`}>{issue.message}</p>)}
      </article>
    );
  }

  return (
    <section className="panel wide-panel" aria-labelledby="review-title">
      <div className="section-heading">
        <div>
          <p className="section-number">Schritt 2</p>
          <h2 id="review-title">Stundenplan prüfen</h2>
        </div>
        {preview ? <button className="secondary compact" type="button" onClick={() => setShowSource((value) => !value)}>Quelle {showSource ? "ausblenden" : "anzeigen"}</button> : null}
      </div>

      {warnings.length > 0 ? (
        <aside className="warning-list" aria-label="Hinweise zur Erkennung">
          {warnings.map((warning, index) => <p key={`${warning.code}-${index}`}>{warning.message}</p>)}
        </aside>
      ) : null}

      {showSource && preview ? <div className="source-preview"><Source preview={preview} /></div> : null}

      <div className="schedule-meta">
        <label>Gültig ab<input type="date" value={draft.validity?.from ?? ""} onChange={(event) => changeValidity("from", event.target.value)} /></label>
        <label>Gültig bis<input type="date" value={draft.validity?.to ?? ""} onChange={(event) => changeValidity("to", event.target.value)} /></label>
        <label>Zeitzone<input value={draft.timezone} onChange={(event) => onChange({ ...draft, timezone: event.target.value })} /></label>
      </div>

      {unassigned.length > 0 ? (
        <section className="day-column unassigned" aria-labelledby="unassigned-title">
          <h3 id="unassigned-title">Noch zuordnen</h3>
          {unassigned.map(renderLesson)}
          <button className="secondary add-button" type="button" onClick={() => addLesson(null)}>Weitere Stunde ergänzen</button>
        </section>
      ) : null}

      <div className="week-grid">
        {days.map((day) => {
          const lessons = lessonsByDay.get(day.key) ?? [];
          return (
            <section className="day-column" key={day.key} aria-labelledby={`day-${day.key}`}>
              <h3 id={`day-${day.key}`}>{day.label}</h3>
              {lessons.length ? lessons.map(renderLesson) : <p className="empty-day">Keine Stunde</p>}
              <button className="secondary add-button" type="button" onClick={() => addLesson(day.key)}>Stunde hinzufügen</button>
            </section>
          );
        })}
      </div>

      {issues.filter((issue) => !issue.lessonIds).map((issue) => <p className="field-error global-error" key={`${issue.code}-${issue.message}`}>{issue.message}</p>)}

      <div className="form-actions">
        <button className="secondary" type="button" onClick={onBack}>Zurück zum Import</button>
        <button type="button" onClick={onConfirm}>Stundenplan bestätigen</button>
      </div>
    </section>
  );
}

function Field({ field, label, lesson, onChange, required = false }: {
  field: "subject" | "classOrCourse" | "room";
  label: string;
  lesson: DraftLesson;
  onChange: (id: string, field: EditableField, value: string) => void;
  required?: boolean;
}) {
  const warning = confidenceWarning(lesson, field);
  return (
    <label className={warning ? "uncertain-field" : ""}>
      {label} {required ? <span aria-hidden="true">*</span> : null}
      <input value={lesson[field] ?? ""} onChange={(event) => onChange(lesson.id, field, event.target.value)} />
      {warning ? <small><span aria-hidden="true">◇</span> {warning}</small> : null}
    </label>
  );
}
