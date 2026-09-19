import { describe, expect, it } from "vitest";
import { confirmScheduleDraft, createAtlasHandoff, ScheduleConfirmationError } from "./confirm";
import { PERSONAL_SCHEDULE_DRAFT_SCHEMA, type PersonalScheduleDraft } from "./schema";

const draft: PersonalScheduleDraft = {
  schema: PERSONAL_SCHEDULE_DRAFT_SCHEMA,
  draftId: "8e913374-05fe-449c-853f-b562d941dcec",
  status: "reviewed",
  createdAt: "2026-09-19T08:00:00.000Z",
  timezone: "Europe/Berlin",
  source: {
    type: "image",
    fileName: "stundenplan.jpg",
    importedAt: "2026-09-19T08:00:00.000Z",
  },
  lessons: [
    {
      id: "f805cb17-b72a-477f-804a-b9663d80a501",
      weekday: "DI",
      startTime: "09:40",
      endTime: "10:25",
      subject: "Deutsch",
      classOrCourse: "7G2",
      confidence: { overall: 0.71, fields: { room: 0.35 } },
      warnings: [{ field: "room", code: "uncertain", message: "Raum unklar" }],
    },
    {
      id: "30083ac0-128a-44a0-a61d-76d9e03f3bbc",
      weekday: "MO",
      startTime: "08:00",
      endTime: "08:45",
      subject: "Geschichte",
      classOrCourse: "11",
      warnings: [],
    },
  ],
};

describe("confirmScheduleDraft", () => {
  it("removes extraction metadata and orders lessons", () => {
    const result = confirmScheduleDraft(draft, {
      exportedAt: "2026-09-19T09:00:00.000Z",
    });

    expect(result.schema).toBe("mosaik.personal-schedule.v1");
    expect(result.lessons.map((lesson) => lesson.weekday)).toEqual(["MO", "DI"]);
    expect(result.lessons[1]).not.toHaveProperty("confidence");
    expect(result.lessons[1]).not.toHaveProperty("warnings");
  });

  it("blocks overlapping lessons", () => {
    const invalid: PersonalScheduleDraft = {
      ...draft,
      lessons: [
        draft.lessons[0],
        {
          ...draft.lessons[0],
          id: "84486b89-8ffd-4fe7-9334-b2b18e005119",
          startTime: "10:00",
          endTime: "10:45",
        },
      ],
    };

    expect(() => confirmScheduleDraft(invalid)).toThrow(ScheduleConfirmationError);
  });

  it("keeps incomplete extraction results editable but blocks confirmation", () => {
    const incomplete: PersonalScheduleDraft = {
      ...draft,
      lessons: [{ ...draft.lessons[0], subject: null }],
    };

    try {
      confirmScheduleDraft(incomplete);
      throw new Error("Expected confirmation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ScheduleConfirmationError);
      expect((error as ScheduleConfirmationError).issues[0]?.code).toBe(
        "INCOMPLETE_OR_INVALID_FIELD",
      );
    }
  });

  it("creates a versioned ATLAS handoff without ATLAS work-time rules", () => {
    const schedule = confirmScheduleDraft(draft, {
      exportedAt: "2026-09-19T09:00:00.000Z",
    });
    const handoff = createAtlasHandoff(schedule, "2026-09-19T09:01:00.000Z");

    expect(handoff.schema).toBe("mosaik.atlas-handoff.v1");
    expect(handoff.payload.lessons[0]).not.toHaveProperty("category");
    expect(handoff.payload.lessons[0]).not.toHaveProperty("workTime");
  });
});
