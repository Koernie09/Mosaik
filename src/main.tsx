import { StrictMode } from "react";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { atlasHandoffSchema, type AtlasHandoff } from "./domain/personal-schedule";
import {
  ATLAS_IMPORT_URL,
  downloadHandoff,
  sendToAtlas,
} from "./lib/atlas-handoff";

function App() {
  const [handoff, setHandoff] = useState<AtlasHandoff | null>(null);
  const [message, setMessage] = useState("");

  async function readHandoff(file: File) {
    try {
      const parsed = atlasHandoffSchema.parse(JSON.parse(await file.text()));
      setHandoff(parsed);
      setMessage(`${parsed.payload.lessons.length} bestätigte Stunden geladen.`);
    } catch {
      setHandoff(null);
      setMessage("Die Datei ist keine gültige MOSAIK-ATLAS-Übergabe.");
    }
  }

  function openAtlas() {
    if (!handoff) return;
    const target = window.open(ATLAS_IMPORT_URL, "mosaik-atlas-import");
    if (!target) {
      setMessage("ATLAS konnte nicht geöffnet werden. Bitte Pop-ups erlauben oder JSON herunterladen.");
      return;
    }
    let attempts = 0;
    const timer = window.setInterval(() => {
      attempts += 1;
      if (!sendToAtlas(target, handoff) || attempts >= 120) window.clearInterval(timer);
    }, 1000);
    sendToAtlas(target, handoff);
    setMessage("ATLAS wurde geöffnet. Dort prüfen und bestätigen Sie den Import.");
  }

  return (
    <main>
      <section aria-labelledby="title">
        <p className="eyebrow">MOSAIK</p>
        <h1 id="title">Aus Fragmenten werden verlässliche Informationen.</h1>
        <p className="intro">
          Der erste Weg entsteht gerade: persönlichen Wochenstundenplan als Foto
          oder PDF einlesen, prüfen und an ATLAS übergeben.
        </p>
        <ol aria-label="Geplanter Ablauf">
          <li><span>1</span> Importieren</li>
          <li><span>2</span> Prüfen</li>
          <li><span>3</span> An ATLAS übergeben</li>
        </ol>
        <div className="handoff">
          <h2>Bestätigten Stundenplan übergeben</h2>
          <p>
            Bis die Erkennungsoberfläche im Repository ergänzt ist, kann hier eine bereits
            bestätigte <code>.mosaik.json</code>-Datei geprüft und sicher an ATLAS übergeben werden.
          </p>
          <label className="file-button">
            Übergabedatei auswählen
            <input
              type="file"
              accept="application/json,.json,.mosaik.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readHandoff(file);
              }}
            />
          </label>
          {handoff ? (
            <div className="actions">
              <button type="button" onClick={openAtlas}>An ATLAS übergeben</button>
              <button type="button" className="secondary" onClick={() => downloadHandoff(handoff)}>
                JSON herunterladen
              </button>
            </div>
          ) : null}
          {message ? <p className="status" role="status">{message}</p> : null}
        </div>
        <p className="note">Fotos und Scans werden ohne ausdrückliche Freigabe nicht extern übertragen.</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
