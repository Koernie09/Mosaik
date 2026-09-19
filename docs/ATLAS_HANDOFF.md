# Übergabevertrag MOSAIK → ATLAS

## Nutzdaten

Die Übergabehülle trägt die Version `mosaik.atlas-handoff.v1` und den Typ
`personal-schedule`. Ihre Nutzlast ist eine bewusst kleine Projektion des
bestätigten Stundenplans:

- `scheduleId`, `confirmedAt`, `timezone` und optional `validity`;
- `lessons[]` mit stabiler ID, Wochentag, Beginn, Ende und optional Stunde,
  Fach, Lerngruppe/Kurs und Raum.

Nicht übertragen werden Dateiname, Rohdatei, Name der Lehrkraft,
Erkennungsbelege, Konfidenzen oder Warnungen. Ebenfalls ausgeschlossen sind
Kategorien, Planzeiten, Arbeitszeitbudgets und Auswertungsregeln. Diese werden
ausschließlich von ATLAS verwaltet.

ATLAS validiert beide Versionen beim Eingang. Unbekannte Hauptversionen werden
nicht stillschweigend importiert. MOSAIK übergibt weder Kategorien noch geplante
Arbeitszeit.

## Transport für den ersten Durchstich

Der Datenvertrag ist vom Transport getrennt. In der ersten gemeinsamen Umsetzung
sind zwei Stufen sinnvoll:

1. **Sicherer Rückfallweg:** MOSAIK lädt eine `.mosaik.json`-Datei herunter;
   ATLAS nimmt sie in seiner bestehenden Importprüfung entgegen.
2. **Direkte Übergabe ohne neue Infrastruktur:** MOSAIK öffnet die kanonische
   ATLAS-Stundenplanseite und übergibt dieselbe Hülle per Browser-`postMessage`
   ausschließlich an den fest hinterlegten ATLAS-Origin. ATLAS validiert vor
   der Zwischenspeicherung in `sessionStorage`. Der Inhalt landet weder in einer
   URL noch dauerhaft im Browser-Speicher. Nach einer nötigen Anmeldung kann die
   Übergabe aus MOSAIK erneut ausgelöst werden.

Ein späterer serverseitiger Einmalcode ist eine mögliche Komforterweiterung,
aber nicht Teil des ersten Meilensteins.

Die Nutzlast gehört nicht in einen Query-Parameter: Stundenplandaten sollen weder
im Browserverlauf noch in Referrer- oder Zugriffsprotokollen als URL erscheinen.

## Erwartetes Verhalten in ATLAS

- Eingangsschema validieren und unbekannte Versionen verständlich ablehnen.
- Gültigkeitszeitraum ergänzen lassen, wenn MOSAIK keinen erkannt hat.
- Vorhandenen Stundenplan erkennen und Ersetzen/Ergänzen ausdrücklich abfragen.
- Fach, Lerngruppe, Raum und Zeiten vor dem Speichern noch einmal anzeigen.
- Erst nach Bestätigung ATLAS-eigene Serien oder Kalenderereignisse erzeugen.
- Keine Rohdatei und keine Extraktions-Konfidenzen übernehmen.

## Konflikt- und Sicherheitsregeln

- Höchstens 200 Wochenstunden und höchstens zwei Jahre Gültigkeit.
- ATLAS erzeugt konkrete Termine nur innerhalb des bestätigten Zeitraums.
- Ein vorhandener ATLAS-Stundenplan wird nie still überschrieben. Die Person
  wählt ausdrücklich „ersetzen“ oder „ergänzen“.
- Beim Ersetzen bleiben bereits bestätigte Arbeitszeiten erhalten. Nur noch
  nicht bestätigte Termine der bisherigen Stundenplanquelle werden ersetzt.
- Unbekannte Schema-Versionen und zusätzliche Felder werden abgelehnt.
