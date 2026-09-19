import { z } from "zod";

export const PERSONAL_SCHEDULE_SCHEMA = "mosaik.personal-schedule.v1" as const;
export const PERSONAL_SCHEDULE_DRAFT_SCHEMA =
  "mosaik.personal-schedule-draft.v1" as const;
export const ATLAS_HANDOFF_SCHEMA = "mosaik.atlas-handoff.v1" as const;

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const localTime = /^([01]\d|2[0-3]):[0-5]\d$/;
const trimmedText = z.string().trim().min(1);

export const weekdaySchema = z.enum(["MO", "DI", "MI", "DO", "FR", "SA", "SO"]);

export const sourceSchema = z.object({
  type: z.enum(["image", "pdf"]),
  fileName: trimmedText.optional(),
  importedAt: z.string().datetime(),
});

export const lessonSchema = z.object({
  id: z.string().uuid(),
  weekday: weekdaySchema,
  startTime: z.string().regex(localTime, "Uhrzeit muss HH:MM entsprechen"),
  endTime: z.string().regex(localTime, "Uhrzeit muss HH:MM entsprechen"),
  period: trimmedText.optional(),
  subject: trimmedText,
  classOrCourse: trimmedText.optional(),
  room: trimmedText.optional(),
});

export const personalScheduleSchema = z.object({
  schema: z.literal(PERSONAL_SCHEDULE_SCHEMA),
  scheduleId: z.string().uuid(),
  exportedAt: z.string().datetime(),
  owner: z.object({ displayName: trimmedText.optional() }).optional(),
  validity: z
    .object({
      from: z.string().regex(isoDate, "Datum muss YYYY-MM-DD entsprechen").optional(),
      to: z.string().regex(isoDate, "Datum muss YYYY-MM-DD entsprechen").optional(),
    })
    .optional(),
  timezone: z.string().trim().min(1).default("Europe/Berlin"),
  lessons: z.array(lessonSchema).min(1),
  source: sourceSchema,
});

const confidenceSchema = z.number().min(0).max(1);

export const draftLessonSchema = lessonSchema.extend({
  weekday: weekdaySchema.nullable(),
  startTime: z.string().regex(localTime, "Uhrzeit muss HH:MM entsprechen").nullable(),
  endTime: z.string().regex(localTime, "Uhrzeit muss HH:MM entsprechen").nullable(),
  period: trimmedText.nullable().optional(),
  subject: trimmedText.nullable(),
  classOrCourse: trimmedText.nullable().optional(),
  room: trimmedText.nullable().optional(),
  confidence: z
    .object({
      overall: confidenceSchema,
      fields: z
        .object({
          weekday: confidenceSchema.optional(),
          startTime: confidenceSchema.optional(),
          endTime: confidenceSchema.optional(),
          period: confidenceSchema.optional(),
          subject: confidenceSchema.optional(),
          classOrCourse: confidenceSchema.optional(),
          room: confidenceSchema.optional(),
        })
        .default({}),
    })
    .optional(),
  evidence: z
    .object({
      page: z.number().int().positive().optional(),
      boundingBox: z
        .object({
          x: z.number().min(0).max(1),
          y: z.number().min(0).max(1),
          width: z.number().positive().max(1),
          height: z.number().positive().max(1),
        })
        .optional(),
      rawText: z.string().optional(),
    })
    .optional(),
  warnings: z
    .array(
      z.object({
        field: z.enum(["weekday", "startTime", "endTime", "period", "subject", "classOrCourse", "room"]).optional(),
        code: trimmedText,
        message: trimmedText,
      }),
    )
    .default([]),
});

export const personalScheduleDraftSchema = z.object({
  schema: z.literal(PERSONAL_SCHEDULE_DRAFT_SCHEMA),
  draftId: z.string().uuid(),
  status: z.enum(["extracted", "reviewed"]),
  createdAt: z.string().datetime(),
  owner: z.object({ displayName: trimmedText.optional() }).optional(),
  validity: personalScheduleSchema.shape.validity,
  timezone: z.string().trim().min(1).default("Europe/Berlin"),
  lessons: z.array(draftLessonSchema).min(1),
  source: sourceSchema,
});

export const atlasHandoffSchema = z.object({
  schema: z.literal(ATLAS_HANDOFF_SCHEMA),
  kind: z.literal("personal-schedule"),
  createdAt: z.string().datetime(),
  payload: personalScheduleSchema,
});

export type Weekday = z.infer<typeof weekdaySchema>;
export type Lesson = z.infer<typeof lessonSchema>;
export type PersonalSchedule = z.infer<typeof personalScheduleSchema>;
export type DraftLesson = z.infer<typeof draftLessonSchema>;
export type PersonalScheduleDraft = z.infer<typeof personalScheduleDraftSchema>;
export type AtlasHandoff = z.infer<typeof atlasHandoffSchema>;
