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
- Bilddateien werden weder hochgeladen noch automatisch analysiert. Sie öffnen
  einen manuellen Entwurf mit einem klaren Hinweis.
- Für lokale OCR existiert bewusst noch keine Implementierung. Vor der Auswahl
  einer OCR-Bibliothek werden Modellbezug, Paketgröße, Geräteperformance und
  Barrierefreiheit geprüft. Eine externe OCR bleibt gesperrt.

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
