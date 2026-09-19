import type { AtlasHandoff, Weekday } from "../domain/personal-schedule";
import { downloadHandoff } from "../lib/atlas-handoff";

const dayNames: Record<Weekday, string> = {
  MO: "Montag",
  DI: "Dienstag",
  MI: "Mittwoch",
  DO: "Donnerstag",
  FR: "Freitag",
  SA: "Samstag",
  SO: "Sonntag",
};

type Props = {
  handoff: AtlasHandoff;
  onBack: () => void;
  onOpenAtlas: () => void;
};

export function HandoffStep({ handoff, onBack, onOpenAtlas }: Props) {
  const { payload } = handoff;
  return (
    <section className="panel" aria-labelledby="handoff-title">
      <div className="section-heading">
        <div>
          <p className="section-number">Schritt 3</p>
          <h2 id="handoff-title">Bereit für ATLAS</h2>
        </div>
        <span className="confirmed-badge">Bestätigt</span>
      </div>

      <dl className="summary-meta">
        <div><dt>Unterrichtsstunden</dt><dd>{payload.lessons.length}</dd></div>
        <div><dt>Gültigkeit</dt><dd>{payload.validity?.from || payload.validity?.to ? `${payload.validity?.from ?? "offen"} – ${payload.validity?.to ?? "offen"}` : "nicht festgelegt"}</dd></div>
        <div><dt>Zeitzone</dt><dd>{payload.timezone}</dd></div>
      </dl>

      <div className="handoff-list" aria-label="Bestätigte Unterrichtsstunden">
        {payload.lessons.map((lesson) => (
          <article key={lesson.id}>
            <div>
              <strong>{dayNames[lesson.weekday]}, {lesson.startTime}–{lesson.endTime}</strong>
              <span>{lesson.subject}</span>
            </div>
            <p>{[lesson.classOrCourse, lesson.room].filter(Boolean).join(" · ") || "Keine Lerngruppe oder Raumangabe"}</p>
          </article>
        ))}
      </div>

      <aside className="atlas-note">
        <strong>ATLAS entscheidet erst nach Deiner Prüfung.</strong>
        <span>Dort bestätigst Du das Ersetzen des vorhandenen Stundenplans ausdrücklich. Arbeitszeit und Kategorien werden ausschließlich in ATLAS bestimmt.</span>
      </aside>

      <div className="handoff-actions">
        <button type="button" onClick={onOpenAtlas}>An ATLAS übergeben</button>
        <button className="secondary" type="button" onClick={() => downloadHandoff(handoff)}>Übergabedatei herunterladen</button>
        <button className="text-button" type="button" onClick={onBack}>Noch einmal prüfen</button>
      </div>
    </section>
  );
}
