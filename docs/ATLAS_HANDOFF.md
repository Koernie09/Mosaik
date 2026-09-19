# Übergabevertrag MOSAIK → ATLAS

## Nutzdaten

Die bestätigte Nutzlast folgt ausschließlich dem Schema
`mosaik.personal-schedule.v1`. Die Übergabehülle trägt die Version
`mosaik.atlas-handoff.v1` und den Typ `personal-schedule`.

ATLAS validiert beide Versionen beim Eingang. Unbekannte Hauptversionen werden
nicht stillschweigend importiert. MOSAIK übergibt weder Kategorien noch geplante
Arbeitszeit.

## Transport für den ersten Durchstich

Der Datenvertrag ist vom Transport getrennt. In der ersten gemeinsamen Umsetzung
sind zwei Stufen sinnvoll:

1. **Sicherer Rückfallweg:** MOSAIK lädt eine `.mosaik.json`-Datei herunter;
   ATLAS nimmt sie in seiner bestehenden Importprüfung entgegen.
2. **Direkte Übergabe:** „An ATLAS übergeben“ sendet dieselbe Übergabehülle per
   `POST` an eine dedizierte ATLAS-Importadresse. ATLAS verlangt nötigenfalls die
   Anmeldung und zeigt danach immer die Importprüfung.

Die Nutzlast gehört nicht in einen Query-Parameter: Stundenplandaten sollen weder
im Browserverlauf noch in Referrer- oder Zugriffsprotokollen als URL erscheinen.

## Erwartetes Verhalten in ATLAS

- Eingangsschema validieren und unbekannte Versionen verständlich ablehnen.
- Gültigkeitszeitraum ergänzen lassen, wenn MOSAIK keinen erkannt hat.
- Vorhandenen Stundenplan erkennen und Ersetzen/Ergänzen ausdrücklich abfragen.
- Fach, Lerngruppe, Raum und Zeiten vor dem Speichern noch einmal anzeigen.
- Erst nach Bestätigung ATLAS-eigene Serien oder Kalenderereignisse erzeugen.
- Keine Rohdatei und keine Extraktions-Konfidenzen übernehmen.
