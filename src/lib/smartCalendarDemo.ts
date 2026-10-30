/** Pure, local-only simulation for the « calendrier intelligent » explainer page. No booking, no network. */
export const DAY_START = 9 * 60; // 9 h
export const BUSY_START = 11 * 60; // 11 h
export const BUSY_END = 12 * 60; // 12 h

export function formatHour(m: number, lang: "fr" | "en" = "fr"): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (lang === "en") return `${h}:${String(mm).padStart(2, "0")}`;
  return `${h} h${mm ? " " + String(mm).padStart(2, "0") : ""}`;
}

export function nextAvailableSlot(duration: number, buffer: number, busy: boolean) {
  const firstEnd = DAY_START + duration;
  let start = firstEnd + buffer;
  const overlaps = busy && start < BUSY_END && start + duration > BUSY_START;
  if (overlaps) start = BUSY_END + buffer;
  return { firstEnd, start, end: start + duration, moved: overlaps };
}
