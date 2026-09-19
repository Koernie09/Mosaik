import { z } from "zod";
import {
  ATLAS_HANDOFF_SCHEMA,
  PERSONAL_SCHEDULE_SCHEMA,
  atlasHandoffSchema,
  personalScheduleDraftSchema,
  personalScheduleSchema,
  type AtlasHandoff,
  type PersonalSchedule,
  type PersonalScheduleDraft,
} from "./schema";
import { compareLessons, findScheduleIssues, type ScheduleIssue } from "./validation";

export class ScheduleConfirmationError extends Error {
  constructor(public readonly issues: ScheduleIssue[]) {
    super("Der Stundenplan kann noch nicht bestätigt werden.");
    this.name = "ScheduleConfirmationError";
  }
}

type ConfirmationOptions = {
  exportedAt?: string;
};

const fieldNames: Record<string, string> = {
  weekday: "Wochentag",
  startTime: "Beginn",
  endTime: "Ende",
  period: "Stunde",
  subject: "Fach",
  classOrCourse: "Lerngruppe oder Klasse",
  room: "Raum",
  timezone: "Zeitzone",
};

export function confirmScheduleDraft(
  input: PersonalScheduleDraft,
  options: ConfirmationOptions = {},
): PersonalSchedule {
  const draft = personalScheduleDraftSchema.parse(input);
  const candidate = personalScheduleSchema.safeParse({
    schema: PERSONAL_SCHEDULE_SCHEMA,
    scheduleId: draft.draftId,
    exportedAt: options.exportedAt ?? new Date().toISOString(),
    owner: draft.owner,
    validity: draft.validity,
    timezone: draft.timezone,
    lessons: draft.lessons.map(({
      confidence: _confidence,
      evidence: _evidence,
      warnings: _warnings,
      period,
      classOrCourse,
      room,
      ...lesson
    }) => ({
      ...lesson,
      ...(period == null ? {} : { period }),
      ...(classOrCourse == null ? {} : { classOrCourse }),
      ...(room == null ? {} : { room }),
    })),
    source: draft.source,
  });

  if (!candidate.success) {
    throw new ScheduleConfirmationError(
      candidate.error.issues.map((issue) => {
        const lessonIndex = issue.path[0] === "lessons" && typeof issue.path[1] === "number"
          ? issue.path[1]
          : undefined;
        return {
          code: "INCOMPLETE_OR_INVALID_FIELD",
          message: `${fieldNames[String(issue.path.at(-1))] ?? "Angabe"}: Bitte ergänzen oder korrigieren.`,
          lessonIds: lessonIndex === undefined ? undefined : [draft.lessons[lessonIndex].id],
        };
      }),
    );
  }

  const schedule = {
    ...candidate.data,
    lessons: [...candidate.data.lessons].sort(compareLessons),
  };

  const issues = findScheduleIssues(schedule);
  if (issues.length > 0) throw new ScheduleConfirmationError(issues);

  return schedule;
}

export function createAtlasHandoff(
  input: PersonalSchedule,
  createdAt = new Date().toISOString(),
): AtlasHandoff {
  return atlasHandoffSchema.parse({
    schema: ATLAS_HANDOFF_SCHEMA,
    kind: "personal-schedule",
    createdAt,
    payload: {
      scheduleId: input.scheduleId,
      confirmedAt: input.exportedAt,
      timezone: input.timezone,
      validity: input.validity,
      lessons: input.lessons,
    },
  });
}

export function parseAtlasHandoff(input: unknown): AtlasHandoff {
  try {
    return atlasHandoffSchema.parse(input);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Ungültige MOSAIK-Übergabe: ${error.issues[0]?.message ?? "unbekannter Fehler"}`);
    }
    throw error;
  }
}
