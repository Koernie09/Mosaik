# Meilenstein 1: Mein Stundenplan aus einem Bild

## Abnahmesatz

> Ich fotografiere meinen ausgedruckten persönlichen Stundenplan. MOSAIK erkennt
> die Woche. Ich korrigiere zwei Fehler. Ich bestätige. Ich öffne ATLAS – und dort
> ist mein Stundenplan.

## Der vollständige, bewusst kleine Weg

1. **Importieren:** ein Bild, PDF oder alten UNTIS-HTML-Export auswählen,
   Text/Tabelle einfügen oder manuell mit einem leeren Plan beginnen.
2. **Extrahieren:** daraus entsteht ein Entwurf; noch nichts gilt als verlässlich.
3. **Prüfen:** Wochenraster und Quelle werden gemeinsam angezeigt. Jede Zelle ist
   änderbar, unsichere Felder sind markiert.
4. **Bestätigen:** erst die ausdrückliche Bestätigung erzeugt
   `mosaik.personal-schedule.v1`.
5. **Übergeben:** ATLAS erhält das versionierte Objekt und zeigt seine eigene
   Importprüfung. Erst ATLAS erzeugt geplante Arbeitszeit.

## Nicht Teil dieses Meilensteins

- allgemeine Dokumentenablage oder Schulmodellierung
- Vertretungspläne, Klassenlisten oder KOMPASS-Anbindung
- mehrere Lehrkräfte in einem Import
- universelle Dokumenterkennung oder große Aktenstapel; Bild-OCR folgt erst nach
  einer ausdrücklich freigegebenen lokalen Lösung
- automatische Synchronisation
- Zuordnung zu ATLAS-Arbeitszeitkategorien

## Zuständigkeiten

**MOSAIK** erkennt, zeigt Unsicherheit, lässt korrigieren und bestätigt Tatsachen.

**ATLAS** entscheidet über Kategorien, Planzeiten, Serien, Ferienausnahmen und die
Wirkung auf Arbeitszeitauswertungen.

## Produktmetriken für V1

- Ein typischer Plan lässt sich einschließlich Korrektur schneller übernehmen als
  manuell eingeben.
- Keine erkannte Unterrichtsstunde wird ohne Bestätigung an ATLAS übergeben.
- Jede unsichere Angabe ist in der Prüfansicht erkennbar und direkt editierbar.
- Eine ungültige Zeit oder Überschneidung blockiert die Bestätigung mit einer
  verständlichen Meldung.
