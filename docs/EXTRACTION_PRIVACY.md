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
werden aber nicht extern übertragen. Als nächste technische Option ist lokale
OCR im Browser zu evaluieren. Dabei muss auch der Bezug des OCR-Modells sauber
dokumentiert werden; die Bilddaten selbst dürfen den Browser nicht verlassen.
