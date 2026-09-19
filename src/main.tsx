import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
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
        <p className="note">
          Technisches Fundament für den ersten vertikalen Meilenstein.
        </p>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
