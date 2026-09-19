import { describe, expect, it } from "vitest";
import { confirmScheduleDraft, ScheduleConfirmationError } from "../personal-schedule";
import { createManualScheduleDraft, extractScheduleFromText } from "./text";

describe("Stundenplan aus Text oder Tabelle", () => {
  it("erkennt zeilenorientierte Stunden", () => {
    const result = extractScheduleFromText([
      "Montag;08:00;08:45;Deutsch;7G2;A123",
      "DI\t09.40\t10.25\tGeschichte\t11\tB204",
    ].join("\n"), { sourceType: "table" });
    expect(result.draft.lessons).toMatchObject([
      { weekday: "MO", startTime: "08:00", endTime: "08:45", subject: "Deutsch", classOrCourse: "7G2", room: "A123" },
      { weekday: "DI", startTime: "09:40", endTime: "10:25", subject: "Geschichte", classOrCourse: "11", room: "B204" },
    ]);
    expect(result.recognizedLines).toBe(2);
  });

  it("erkennt ein kopiertes Wochenraster", () => {
    const result = extractScheduleFromText([
      "Zeit\tMontag\tDienstag",
      "08:00–08:45\tDeutsch / 7G2 / A123\tGeschichte / 11 / B204",
    ].join("\n"), { sourceType: "table" });
    expect(result.draft.lessons).toEqual(expect.arrayContaining([
      expect.objectContaining({ weekday: "MO", subject: "Deutsch", classOrCourse: "7G2", room: "A123" }),
      expect.objectContaining({ weekday: "DI", subject: "Geschichte", classOrCourse: "11", room: "B204" }),
    ]));
  });

  it("liefert bei leerer Eingabe einen bearbeitbaren, aber nicht bestätigbaren Entwurf", () => {
    const result = extractScheduleFromText("");
    expect(result.warnings[0]?.code).toBe("EMPTY_SOURCE");
    expect(() => confirmScheduleDraft(result.draft)).toThrow(ScheduleConfirmationError);
  });

  it("legt für die manuelle Eingabe genau eine leere Startzeile an", () => {
    const draft = createManualScheduleDraft();
    expect(draft.source.type).toBe("manual");
    expect(draft.lessons).toHaveLength(1);
    expect(draft.lessons[0].subject).toBeNull();
  });

  it("erkennt eine UNTIS-Unterrichtsverteilung als unplatzierte Wochenstunden", () => {
    const result = extractScheduleFromText([
      "BEISPIEL-GYMNASIUM\tSchuljahr 2024/2025\tUntis 2025",
      "Xx\tBeispielname",
      "Wst\tFach\tLehrer\tKlasse(n)\tVon\tBis\tText\tWert",
      "3\tDe2\tXx\t13\t3.2.\t8.6.\tL 9\t1.14",
      "4\tD\tXx\t8A\t3.2.\t1.90",
      "2\tWuN\tXx\t9A,9B\t3.2.\t0.95",
      "2\tWuN\tXx\t10A,10B\t3.2.\t0.95",
      "2\tDe2\tXx\t11A,11B,11C\t3.2.\tL 11\t0.95",
      "Anrechnungen",
      "5079\tXx\tSL\t11.00\t3.2.2025\tStändige Vertretung",
    ].join("\n"), { sourceType: "pdf" });

    expect(result.draft.lessons).toHaveLength(13);
    expect(result.draft.lessons.filter((lesson) => lesson.subject === "D")).toHaveLength(4);
    expect(result.draft.lessons[0]).toEqual(expect.objectContaining({
      weekday: null,
      startTime: null,
      endTime: null,
      subject: "De2",
      classOrCourse: "13",
    }));
    expect(result.warnings).toEqual([
      expect.objectContaining({ code: "TEACHING_ASSIGNMENT_WITHOUT_TIMES" }),
    ]);
    expect(result.recognizedLines).toBe(6);
  });
});
