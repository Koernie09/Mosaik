// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { decodeHtmlFile, extractScheduleFromHtml } from "./html";

const legacyUntisHtml = `<!doctype html>
<html><head><meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1"></head>
<body>
  <b>gilt ab Montag; 5. November 2007</b>
  <table>
    <tr><td></td><td>Montag</td><td>Dienstag</td><td>Mittwoch</td><td>Donnerstag</td><td>Freitag</td></tr>
    <tr><td>1</td><td>Präsenz<br>X</td><td></td><td rowspan="2">Deutsch<br>6D<br>B216</td><td></td><td rowspan="2">Deutsch<br>6D<br>B216</td></tr>
    <tr><td>2</td><td rowspan="2">Deutsch-LK<br>13A<br>GGR</td><td></td><td></td></tr>
    <tr><td>3</td><td></td><td></td><td>Geschichte<br>6D<br>B216</td><td rowspan="2">PHIL-G.<br>12A<br>GGR<br>12B<br>1)<br>Beispiel<br>12C</td></tr>
    <tr><td>4</td><td></td><td></td><td></td><td rowspan="2">SEMA<br>13A<br>A301</td></tr>
    <tr><td>5</td><td></td><td></td><td></td><td>.TR-Süd</td></tr>
    <tr><td>6</td><td></td><td></td><td></td><td rowspan="2">Deutsch-LK<br>13A<br>A305</td><td>Geschichte<br>6D<br>B216</td></tr>
    <tr><td>7</td><td></td><td></td><td></td><td></td></tr>
  </table>
  <table>
    <tr><td>Nr.</td><td>Le.,Fa.,Rm.</td><td>Kla.</td><td>Text</td></tr>
    <tr><td>1)</td><td>XX, PHIL-G, GGR</td><td>12A, 12B, 12C</td><td></td></tr>
  </table>
</body></html>`;

describe("alte UNTIS-HTML-Stundenpläne", () => {
  it("rekonstruiert Wochenraster, Zellverbünde, Fußnoten und Gültigkeit", () => {
    const result = extractScheduleFromHtml(legacyUntisHtml, "alter-plan.html");

    expect(result.draft.source).toMatchObject({ type: "html", fileName: "alter-plan.html" });
    expect(result.draft.validity).toEqual({ from: "2007-11-05" });
    expect(result.draft.lessons).toHaveLength(10);
    expect(result.draft.lessons).toEqual(expect.arrayContaining([
      expect.objectContaining({ weekday: "MI", period: "1–2", subject: "Deutsch", classOrCourse: "6D", room: "B216" }),
      expect.objectContaining({ weekday: "MO", period: "2–3", subject: "Deutsch-LK", classOrCourse: "13A", room: "GGR" }),
      expect.objectContaining({ weekday: "FR", period: "3–4", subject: "PHIL-G", classOrCourse: "12A, 12B, 12C", room: "GGR" }),
      expect.objectContaining({ weekday: "FR", period: "5", subject: ".TR-Süd", classOrCourse: null, room: null }),
    ]));
    expect(result.draft.lessons.every((lesson) => lesson.startTime === null && lesson.endTime === null)).toBe(true);
    expect(result.warnings).toEqual([expect.objectContaining({ code: "HTML_PERIOD_TIMES_MISSING" })]);
  });

  it("dekodiert alte ISO-8859-1-Exporte mit deutschen Sonderzeichen", async () => {
    const encoded = Uint8Array.from([...legacyUntisHtml].map((character) => {
      if (character === "ä") return 0xe4;
      if (character === "ü") return 0xfc;
      return character.charCodeAt(0);
    }));
    const decoded = await decodeHtmlFile(new File([encoded], "alt.html", { type: "text/html" }));

    expect(decoded).toContain("Präsenz");
    expect(decoded).toContain(".TR-Süd");
  });

  it("liefert bei anderer HTML-Struktur einen manuellen Entwurf statt falscher Daten", () => {
    const result = extractScheduleFromHtml("<html><body><p>Kein Stundenplan</p></body></html>");

    expect(result.warnings[0]?.code).toBe("HTML_NO_TIMETABLE");
    expect(result.draft.lessons).toHaveLength(1);
    expect(result.draft.lessons[0].subject).toBeNull();
  });
});
