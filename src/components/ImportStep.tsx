import { useRef, useState, type DragEvent } from "react";

type Props = {
  busy: boolean;
  onFile: (file: File) => Promise<void>;
  onManual: () => void;
  onText: (text: string) => void;
};

export function ImportStep({ busy, onFile, onManual, onText }: Props) {
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  function takeFile(file?: File) {
    if (file && !busy) void onFile(file);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    takeFile(event.dataTransfer.files[0]);
  }

  return (
    <section className="panel" aria-labelledby="import-title">
      <div className="section-heading">
        <div>
          <p className="section-number">Schritt 1</p>
          <h2 id="import-title">Was liegt Dir vor?</h2>
        </div>
        <p>Du kannst mit jeder vorhandenen Form beginnen.</p>
      </div>

      <div className="import-grid">
        <label className="import-card primary-card">
          <span className="card-icon" aria-hidden="true">⌁</span>
          <strong>Foto aufnehmen</strong>
          <span>Mit Kamera oder Fotomediathek</span>
          <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(event) => takeFile(event.target.files?.[0])} />
        </label>

        <button className="import-card" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
          <span className="card-icon" aria-hidden="true">↑</span>
          <strong>Datei auswählen</strong>
          <span>PDF, Bild, Text, CSV oder TSV</span>
        </button>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept="application/pdf,image/*,text/plain,text/csv,text/tab-separated-values,.pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,.csv,.tsv"
          disabled={busy}
          aria-label="Stundenplandatei auswählen"
          onChange={(event) => takeFile(event.target.files?.[0])}
        />

        <button className="import-card" type="button" disabled={busy} onClick={onManual}>
          <span className="card-icon" aria-hidden="true">＋</span>
          <strong>Manuell beginnen</strong>
          <span>Eine leere Unterrichtsstunde anlegen</span>
        </button>
      </div>

      <div
        className={`drop-zone ${dragging ? "dragging" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        Datei hier ablegen
      </div>

      <div className="text-import">
        <label htmlFor="schedule-text">Text oder kopierte Tabelle einfügen</label>
        <p className="field-help">Zum Beispiel: Montag; 08:00; 08:45; Deutsch; 7G2; R12</p>
        <textarea id="schedule-text" rows={6} value={text} placeholder="Mo 08:00–08:45 Deutsch 7G2 R12" onChange={(event) => setText(event.target.value)} />
        <button type="button" disabled={busy || !text.trim()} onClick={() => onText(text)}>Text lokal auswerten</button>
      </div>

      <aside className="privacy-note">
        <strong>Deine Daten bleiben hier.</strong>
        <span>Es wird nichts hochgeladen. PDFs und Texte werden lokal im Browser gelesen.</span>
      </aside>
    </section>
  );
}
