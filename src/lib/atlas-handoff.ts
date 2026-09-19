import { atlasHandoffSchema, type AtlasHandoff } from "../domain/personal-schedule";

export const ATLAS_ORIGIN = "https://atlas.memos-schulorganisation.de";
export const ATLAS_IMPORT_URL = `${ATLAS_ORIGIN}/planning/stundenplan?mosaik=1`;
export const ATLAS_MESSAGE_TYPE = "mosaik.atlas-handoff.v1";

type AtlasTarget = Pick<Window, "postMessage" | "closed">;

type AtlasWindowEnvironment = {
  open: (url: string, target: string) => AtlasTarget | null;
  setInterval: (callback: () => void, delay: number) => number;
  clearInterval: (id: number) => void;
};

export function atlasMessage(handoff: AtlasHandoff) {
  return {
    type: ATLAS_MESSAGE_TYPE,
    handoff: atlasHandoffSchema.parse(handoff),
  } as const;
}

export function sendToAtlas(target: AtlasTarget, handoff: AtlasHandoff): boolean {
  if (target.closed) return false;
  target.postMessage(atlasMessage(handoff), ATLAS_ORIGIN);
  return true;
}

export function openAtlasWithHandoff(
  handoff: AtlasHandoff,
  environment: AtlasWindowEnvironment = window,
): boolean {
  const target = environment.open(ATLAS_IMPORT_URL, "mosaik-atlas-import");
  if (!target) return false;
  let attempts = 0;
  const timer = environment.setInterval(() => {
    attempts += 1;
    if (!sendToAtlas(target, handoff) || attempts >= 120) environment.clearInterval(timer);
  }, 1000);
  sendToAtlas(target, handoff);
  return true;
}

export function downloadHandoff(handoff: AtlasHandoff): void {
  const safe = atlasHandoffSchema.parse(handoff);
  const blob = new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `MOSAIK_Stundenplan_${safe.payload.scheduleId}.mosaik.json`;
  link.click();
  URL.revokeObjectURL(url);
}
