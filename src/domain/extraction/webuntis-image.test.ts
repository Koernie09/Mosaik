import { describe, expect, it } from "vitest";
import { extractWebUntisFromVision, type WebUntisVisionInput } from "./webuntis-image";

type WordInput = [text: string, left: number, top: number, width?: number, height?: number];

const word = ([text, left, top, width = 60, height = 18]: WordInput) => ({
  text, left, top, width, height, confidence: 92,
});

const centers = [300, 754, 1208, 1660, 2115];
const times: WordInput[] = [
  ["07:30", 15, 397], ["08:15", 16, 510], ["08:20", 14, 553], ["09:05", 14, 666],
  ["09:10", 15, 708], ["09:55", 14, 821], ["10:15", 17, 911], ["11:00", 17, 1024],
  ["11:05", 17, 1066], ["11:50", 17, 1179], ["12:10", 18, 1268], ["12:55", 18, 1382],
  ["13:00", 16, 1424], ["13:45", 16, 1537],
];

const cards = [
  { day: 0, top: 550, bottom: 840, lines: ["13", "DeE2", "D0.06"] },
  { day: 0, top: 908, bottom: 1198, lines: ["Koord"] },
  { day: 1, top: 908, bottom: 1042, lines: ["12", "DeE3", "D1.06"] },
  { day: 2, top: 908, bottom: 1198, lines: ["12", "DeE3", "D1.06"] },
  { day: 4, top: 394, bottom: 529, lines: ["12", "WuNN3.", "D1.08"] },
];

function fixture(): WebUntisVisionInput {
  const cardWords = cards.flatMap((card) => card.lines.map((text, line) =>
    word([text, centers[card.day] - 180, card.top + 12 + line * 29, 90]),
  ));
  return {
    width: 2360,
    height: 1640,
    words: [
      word(["Stundenplan", 950, 95, 190, 30]),
      ...centers.map((center, index) => word([String(21 + index), center - 15, 322, 35, 23])),
      ...times.map(word),
      ...cardWords,
    ],
    isWhite: (x, y) => cards.some((card) => {
      const left = card.day === 0 ? 70 : (centers[card.day - 1] + centers[card.day]) / 2 + 4;
      const right = card.day === 4 ? 2350 : (centers[card.day] + centers[card.day + 1]) / 2 - 4;
      return x > left && x < right && y >= card.top && y <= card.bottom;
    }),
    fileName: "webuntis.png",
  };
}

describe("WebUntis-Screenshots", () => {
  it("ordnet Karten anhand von Tages- und Zeitraster als Unterricht ein", () => {
    const result = extractWebUntisFromVision(fixture());

    expect(result?.draft.lessons).toHaveLength(4);
    expect(result?.draft.lessons).toEqual(expect.arrayContaining([
      expect.objectContaining({ weekday: "MO", startTime: "08:20", endTime: "09:55", period: "1–2", subject: "DeE2", classOrCourse: "13", room: "D0.06" }),
      expect.objectContaining({ weekday: "DI", startTime: "10:15", endTime: "11:00", period: "3", subject: "DeE3", classOrCourse: "12", room: "D1.06" }),
      expect.objectContaining({ weekday: "MI", startTime: "10:15", endTime: "11:50", period: "3–4", subject: "DeE3" }),
      expect.objectContaining({ weekday: "FR", startTime: "07:30", endTime: "08:15", period: "0", subject: "WuNN3" }),
    ]));
    expect(result?.warnings).toEqual([
      expect.objectContaining({ code: "WEBUNTIS_SCREENSHOT_RECOGNIZED" }),
      expect.objectContaining({ code: "WEBUNTIS_UNCLEAR_ENTRIES", message: expect.stringContaining("Koord") }),
    ]);
  });

  it("verwirft unvollständige Raster statt Uhrzeiten zu erfinden", () => {
    const input = fixture();
    input.words = input.words.filter((item) => item.text !== "12:55");
    expect(extractWebUntisFromVision(input)).toBeNull();
  });
});
