# Architektur und Datenschutz: Foto/Scan → Stundenplan

## Zielarchitektur

1. **Lokale Vorprüfung:** Dateityp, Größe, Seitenzahl und Bildqualität werden im
   Browser geprüft. Eine vorhandene PDF-Textebene wird ausschließlich lokal
   gelesen.
2. **Lokale Strukturierung:** Tabellenraster, Wochentage und Uhrzeiten werden
   aus der Textebene bzw. aus lokal erkannten Textblöcken zu einem
   `mosaik.personal-schedule-draft.v1` zusammengesetzt. Quelle und
   Erkennungsbelege bleiben im Browser.
3. **Prüfung:** Jede Stunde ist editierbar. Unsichere oder unvollständige Felder
   sind sichtbar; ohne Wochentag, Beginn, Ende und Fach ist keine Bestätigung
   möglich.
4. **Bestätigung:** Erst jetzt entsteht der bereinigte Stundenplan. An ATLAS
   gehen ausschließlich die im Handoff-Vertrag genannten Tatsachen.

## Im technischen Kern umgesetzt

- Text-, CSV-, TSV- und kopierte Tabelleneingaben werden lokal normalisiert.
- Alte UNTIS-HTML-Dateien werden lokal als inaktives Dokument geparst. Skripte
  werden nicht ausgeführt und verknüpfte Stylesheets oder andere Ressourcen
  nicht geladen. Auch Exporte mit ISO-8859-1-Zeichensatz werden unterstützt.
  Tabellenverbünde und Fußnoten liefern Wochentag, Stundennummer, Fach,
  Lerngruppe und Raum. Nicht enthaltene Uhrzeiten werden nicht erfunden.
- PDFs mit Textebene werden mit `pdfjs-dist` vollständig im Browser gelesen;
  Dateigröße (15 MB) und Seitenzahl (20) sind begrenzt.
- UNTIS-Unterrichtsverteilungen werden als Teilinformation erkannt: Fach,
  Lerngruppe und Wochenstundenzahl erzeugen unplatzierte Unterrichtsstunden.
  Wochentag und Uhrzeit werden niemals erfunden, sondern müssen vor der
  Bestätigung aus einem Wochenplan ergänzt werden.
- WebUntis-Screenshots werden mit lokal ausgeliefertem Tesseract.js 7 und dem
  englischen Tesseract-Sprachmodell im Browser analysiert. Der Parser nutzt
  zusätzlich die Lage der Karten im Wochen- und Zeitraster. Andere Bildtypen
  öffnen weiterhin einen manuellen Entwurf mit einem klaren Hinweis.

### Lokale OCR: dokumentierter Datenfluss

| Punkt | Festlegung |
| --- | --- |
| Anbieter / Software | Open-Source-Bibliothek Tesseract.js 7 (Naptha) mit Tesseract-Sprachmodell; Apache-2.0-Lizenz |
| Datenfluss | Bilddatei → Canvas im Browser → lokaler WebWorker/WebAssembly → OCR-Wörter und Koordinaten → MOSAIK-Entwurf |
| Externe Übertragung | Keine. Bild, OCR-Text und Entwurf werden an keinen OCR-, KI- oder WebUntis-Dienst gesendet. |
| Serverstandort | Keine serverseitige Bildverarbeitung. Worker, WebAssembly und Sprachmodell werden als statische Dateien vom selben Ursprung wie MOSAIK geladen. |
| Speicherdauer | Bild und OCR-Ergebnis nur im Arbeitsspeicher des geöffneten Tabs; die Vorschau-URL wird beim Verlassen freigegeben. Tesseract kann ausschließlich das unveränderliche Sprachmodell lokal zwischenspeichern. |
| Modelltraining | Kein Training und keine Weitergabe von Eingaben. |
| Datenminimierung | Es wird nur der ausgewählte Screenshot verarbeitet; an ATLAS gehen erst nach Prüfung nur bestätigte Unterrichtsdaten. |

Die lokalen OCR-Dateien werden beim Build aus fest versionierten npm-Paketen in
MOSAIK übernommen. Die Laufzeitkonfiguration verweist ausdrücklich auf diese
same-origin-Dateien und nicht auf die Standard-CDNs von Tesseract.js.

## Externe Erkennung: Freigabesperre

Eine Übertragung von Foto, Scan, PDF oder daraus gewonnenem Text an einen
externen Dienst ist derzeit **nicht implementiert und nicht freigegeben**.
Vor einer Implementierung müssen in diesem Dokument konkret ergänzt und durch
den Projekteigner ausdrücklich freigegeben werden:

| Punkt | Vor Freigabe erforderlich |
| --- | --- |
| Anbieter / Unterauftragnehmer | Firmenname, Produkt, Auftragsverarbeitung |
| Datenfluss | Welche Datei/Textteile gehen über welche Endpunkte? |
| Serverstandort | Land und konkrete Verarbeitungsregion |
| Speicherdauer | Eingabe, Logs, Backups; Löschmechanismus |
| Modelltraining | Vertraglicher Ausschluss der Trainingsnutzung |
| Rechtsgrundlage | DSGVO-Rollen, AVV, TOM und ggf. Drittlandtransfer |
| Datenminimierung | Zuschnitt/Schwärzung, Metadatenentfernung, Pseudonymisierung |

Bis dahin gilt: Fotos und Scans können ausgewählt und lokal angezeigt werden,
werden aber nicht extern übertragen. Die lokale Erkennung bleibt vorerst auf
WebUntis-Screenshots begrenzt; freie Fotos und Scans führen zur manuellen
Erfassung. Die Bilddaten dürfen den Browser nicht verlassen.
