# Umsetzungsbrief für Lovable: Meilenstein 1

Baue ausschließlich den vollständigen Weg **Import → Prüfen → Bestätigen → an
ATLAS übergeben** für den persönlichen Wochenstundenplan einer einzelnen Lehrkraft.

## Verbindlich

- Verwende die Typen und Funktionen aus `src/domain/personal-schedule`; erfinde
  kein paralleles UI-Datenmodell.
- Die Quelle ist genau ein Bild oder PDF. Vor dem Upload werden Typ und eine
  angemessene Dateigröße geprüft.
- Das Extraktionsergebnis ist immer ein Draft. Niemals direkt an ATLAS senden.
- Fehlende erkannte Pflichtangaben bleiben im Draft als `null` editierbar; sie
  dürfen nicht durch erfundene Werte ersetzt oder vor der Prüfansicht verworfen werden.
- Die Prüfansicht zeigt ein Wochenraster und bei Bedarf die Originalquelle.
- Jede erkannte Angabe ist direkt bearbeitbar. Niedrige Konfidenz und Warnungen
  werden dezent am betroffenen Feld, nicht als pauschaler Alarm, angezeigt.
- „Stundenplan bestätigen“ ruft `confirmScheduleDraft` auf. Semantische Fehler
  bleiben sichtbar im Raster und blockieren die Bestätigung.
- Nach der Bestätigung entsteht mit `createAtlasHandoff` genau die dokumentierte
  Übergabehülle.
- Quelle und Draft werden zunächst nur für den laufenden Vorgang gehalten. Keine
  dauerhafte Speicherung ohne eine spätere, ausdrückliche Datenschutzentscheidung.

## Oberfläche

Die Hauptnavigation für V1 besteht nur aus drei nachvollziehbaren Zuständen:

1. **Importieren** – Foto aufnehmen, Bild oder PDF auswählen.
2. **Prüfen** – erkannte Woche korrigieren; Quelle ein- und ausblenden.
3. **Übergeben** – Zusammenfassung und eindeutige Aktion „An ATLAS übergeben“.

Mobil muss die Prüfansicht ohne winzige Tabellenzellen funktionieren. Unterhalb
einer geeigneten Breite darf jeder Wochentag als eigener Abschnitt erscheinen.
Desktop und Tablet können das Wochenraster verwenden.

## Noch nicht bauen

Benutzerverwaltung, allgemeines Dashboard, Dokumentenarchiv, KOMPASS-Anbindung,
Schulmodell, Vertretungsplan, Stapelverarbeitung oder automatische Synchronisation.
