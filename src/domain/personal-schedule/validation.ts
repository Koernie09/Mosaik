import type { Lesson, PersonalSchedule } from "./schema";

export type ScheduleIssue = {
  code:
    | "INCOMPLETE_OR_INVALID_FIELD"
    | "INVALID_TIME_RANGE"
    | "OVERLAPPING_LESSONS"
    | "INVALID_VALIDITY";
  message: string;
  lessonIds?: string[];
};

const weekdayOrder = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"] as const;

function minutes(time: string): number {
  const [hours, mins] = time.split(":").map(Number);
  return hours * 60 + mins;
}

export function compareLessons(a: Lesson, b: Lesson): number {
  return (
    weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday) ||
    a.startTime.localeCompare(b.startTime) ||
    a.endTime.localeCompare(b.endTime)
  );
}

export function findScheduleIssues(schedule: PersonalSchedule): ScheduleIssue[] {
  const issues: ScheduleIssue[] = [];

  if (
    schedule.validity?.from &&
    schedule.validity?.to &&
    schedule.validity.from > schedule.validity.to
  ) {
    issues.push({
      code: "INVALID_VALIDITY",
      message: "Das Ende des Gültigkeitszeitraums liegt vor seinem Beginn.",
    });
  }

  for (const lesson of schedule.lessons) {
    if (minutes(lesson.endTime) <= minutes(lesson.startTime)) {
      issues.push({
        code: "INVALID_TIME_RANGE",
        message: `${lesson.weekday} ${lesson.startTime}: Das Ende muss nach dem Beginn liegen.`,
        lessonIds: [lesson.id],
      });
    }
  }

  const ordered = [...schedule.lessons].sort(compareLessons);
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (
      previous.weekday === current.weekday &&
      minutes(current.startTime) < minutes(previous.endTime)
    ) {
      issues.push({
        code: "OVERLAPPING_LESSONS",
        message: `${current.weekday}: Zwei Unterrichtseinträge überschneiden sich.`,
        lessonIds: [previous.id, current.id],
      });
    }
  }

  return issues;
}
