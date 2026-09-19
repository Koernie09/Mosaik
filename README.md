# MOSAIK

**Modellierung und Organisation schulischer Abläufe aus Informationsfragmenten
und Kontext**

Gib MOSAIK, was du hast: ein Foto, einen PDF-Stundenplan, eine UNTIS-Datei oder
später auch viele gescannte Seiten. Jedes Informationsstück kann sofort nützlich
sein – und zugleich das Modell der Schule vervollständigen.

Der erste Meilenstein ist absichtlich kleiner: den persönlichen Wochenstundenplan
einer Lehrkraft aus PDF-Text, kopierter Tabelle, Text oder manueller Eingabe in
einen gemeinsamen Entwurf überführen, gemeinsam prüfen und als bestätigte
Information an ATLAS übergeben. Bilder bleiben lokal; eine lokale OCR wird erst
nach gesonderter technischer Prüfung ergänzt.

## Technischer Stand

Dieses Repository enthält die React-/TypeScript-Anwendung und den verbindlichen
Domänenkern für:

`Quelle → Extraktionsentwurf → Prüfung → bestätigter Stundenplan → ATLAS-Übergabe`

Die Oberfläche führt durch Import, lokale Auswertung, mobile bzw. desktopgerechte
Prüfung und die bestätigte Übergabe an ATLAS. Foto- und Scanquellen bleiben lokal;
solange keine ausdrücklich freigegebene lokale Erkennung vorliegt, führt MOSAIK
ehrlich zur manuellen Erfassung.

Neben Wochenrastern erkennt der lokale Parser UNTIS-Unterrichtsverteilungen mit
Fach, Lerngruppe und Wochenstundenzahl. Da diese Listen keine Wochentage und
Uhrzeiten enthalten, erzeugt MOSAIK daraus bewusst unplatzierte Stunden, die vor
der Bestätigung zeitlich ergänzt werden müssen.

## Lokal starten

```bash
npm install
npm run dev
```

Prüfen:

```bash
npm test
npm run build
```

## Wichtige Dokumente

- [`docs/MILESTONE_1.md`](docs/MILESTONE_1.md): Umfang und Abnahme
- [`docs/ATLAS_HANDOFF.md`](docs/ATLAS_HANDOFF.md): Grenze und Übergabevertrag
- [`docs/LOVABLE_BRIEF.md`](docs/LOVABLE_BRIEF.md): enger Umsetzungsauftrag
- [`examples/personal-schedule.v1.json`](examples/personal-schedule.v1.json): Beispiel
