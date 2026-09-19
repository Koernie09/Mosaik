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
});

