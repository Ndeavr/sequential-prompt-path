import { describe, it, expect } from "vitest";
import { nextAvailableSlot, formatHour, BUSY_START, BUSY_END } from "@/lib/smartCalendarDemo";

describe("smart calendar demo", () => {
  it("60 min visit + 30 min buffer → next slot 10 h 30", () => {
    expect(formatHour(nextAvailableSlot(60, 30, false).start)).toBe("10 h 30");
  });
  it("busy 11–12 pushes next slot to 12 h 30", () => {
    expect(formatHour(nextAvailableSlot(60, 30, true).start)).toBe("12 h 30");
  });
  it("never overlaps the 11–12 block for any slider combo", () => {
    for (let d = 30; d <= 90; d += 15)
      for (let b = 15; b <= 60; b += 15) {
        const s = nextAvailableSlot(d, b, true);
        expect(s.start >= BUSY_END || s.end <= BUSY_START).toBe(true);
        expect(s.start - s.firstEnd).toBeGreaterThanOrEqual(b);
      }
  });
});
