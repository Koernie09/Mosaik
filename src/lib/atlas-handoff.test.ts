import { describe, expect, it, vi } from "vitest";
import { createAtlasHandoff } from "../domain/personal-schedule";
import type { PersonalSchedule } from "../domain/personal-schedule";
import { ATLAS_MESSAGE_TYPE, ATLAS_ORIGIN, sendToAtlas } from "./atlas-handoff";

const schedule: PersonalSchedule = {
  schema: "mosaik.personal-schedule.v1",
  scheduleId: "8e913374-05fe-449c-853f-b562d941dcec",
  exportedAt: "2026-09-19T09:00:00.000Z",
  timezone: "Europe/Berlin",
  validity: { from: "2026-09-21", to: "2027-01-31" },
  source: { type: "pdf", importedAt: "2026-09-19T08:00:00.000Z" },
  lessons: [{
    id: "30083ac0-128a-44a0-a61d-76d9e03f3bbc",
    weekday: "MO",
    startTime: "08:00",
    endTime: "08:45",
    subject: "Deutsch",
  }],
};

describe("ATLAS-Browserübergabe", () => {
  it("sendet nur an den festgelegten ATLAS-Origin", () => {
    const postMessage = vi.fn();
    expect(sendToAtlas({ postMessage, closed: false }, createAtlasHandoff(schedule))).toBe(true);
    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: ATLAS_MESSAGE_TYPE }),
      ATLAS_ORIGIN,
    );
  });

  it("sendet nicht mehr an ein geschlossenes Fenster", () => {
    const postMessage = vi.fn();
    expect(sendToAtlas({ postMessage, closed: true }, createAtlasHandoff(schedule))).toBe(false);
    expect(postMessage).not.toHaveBeenCalled();
  });
});

