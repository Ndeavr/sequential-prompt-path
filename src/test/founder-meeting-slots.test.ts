import { describe, expect, it } from "vitest";
import {
  formatSlotFull, formatSlotTime, isProposedSlotStillValid, proposeFounderMeetingDays, zonedWallTimeToUtc,
} from "@/lib/founderMeetingSlots";

const local = (iso: string) => new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Toronto", hourCycle: "h23", weekday: "short", hour: "2-digit", minute: "2-digit",
}).format(new Date(iso));

describe("Horaires proposés fondateur (90 min, 10 h–15 h, Montréal)", () => {
  it("3 horaires par jour : 10:00–11:30, 11:30–13:00, 13:00–14:30, fin avant 15 h", () => {
    const days = proposeFounderMeetingDays(new Date("2026-11-12T21:00:00Z"));
    expect(days.length).toBe(5);
    for (const d of days) {
      expect(d.slots.map((s) => s.localStart)).toEqual(["10:00", "11:30", "13:00"]);
      for (const s of d.slots) {
        expect(Date.parse(s.endIso) - Date.parse(s.startIso)).toBe(90 * 60_000);
        const [h, m] = local(s.endIso).split(" ")[1].split(":").map(Number);
        expect(h * 60 + m).toBeLessThanOrEqual(15 * 60);
      }
    }
  });

  it("jours ouvrables seulement, délai de 24 h : jeudi 16 h → vendredi puis lundi", () => {
    const days = proposeFounderMeetingDays(new Date("2026-11-12T21:00:00Z"));
    expect(days.map((d) => d.localDate)).toEqual(["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20"]);
    const early = proposeFounderMeetingDays(new Date("2026-11-12T13:00:00Z")); // jeudi 8 h
    expect(early[0].localDate).toBe("2026-11-13");
    expect(days.every((d) => !["Sat", "Sun"].includes(local(d.slots[0].startIso).split(" ")[0].replace(",", "")))).toBe(true);
  });

  it("changement d'heure (1er nov. 2026) : 10 h locale = 14:00Z avant, 15:00Z après", () => {
    expect(new Date(zonedWallTimeToUtc(2026, 10, 30, 10, 0)).toISOString()).toBe("2026-10-30T14:00:00.000Z");
    expect(new Date(zonedWallTimeToUtc(2026, 11, 2, 10, 0)).toISOString()).toBe("2026-11-02T15:00:00.000Z");
    expect(new Date(zonedWallTimeToUtc(2027, 3, 15, 13, 0)).toISOString()).toBe("2027-03-15T17:00:00.000Z");
    const days = proposeFounderMeetingDays(new Date("2026-10-29T12:00:00Z"));
    expect(days.map((d) => d.slots[0].startIso).slice(0, 2)).toEqual(["2026-10-30T14:00:00.000Z", "2026-11-02T15:00:00.000Z"]);
  });

  it("affichage FR-CA / EN-CA avec fuseau", () => {
    const s = proposeFounderMeetingDays(new Date("2026-11-12T21:00:00Z"))[0].slots[0];
    expect(formatSlotTime(s, "fr")).toBe("10 h 00 à 11 h 30 (HNE)");
    expect(formatSlotFull(s, "fr")).toBe("lundi 16 novembre, 10 h 00 à 11 h 30 (HNE)");
    expect(formatSlotTime(s, "en")).toMatch(/^10:00 a\.m\. to 11:30 a\.m\. \(EST\)$/);
  });

  it("revalidation : horaire passé, hors plage ou mauvaise durée refusé", () => {
    const now = new Date("2026-11-12T21:00:00Z");
    const s = proposeFounderMeetingDays(now)[0].slots[2];
    expect(isProposedSlotStillValid(s, now)).toBe(true);
    expect(isProposedSlotStillValid(s, new Date("2026-11-16T10:00:00Z"))).toBe(false);
    expect(isProposedSlotStillValid({ ...s, startIso: "2026-11-16T19:00:00.000Z", endIso: "2026-11-16T20:30:00.000Z" }, now)).toBe(false); // 14 h locale
    expect(isProposedSlotStillValid({ ...s, endIso: "2026-11-16T20:00:00.000Z" }, now)).toBe(false);
    expect(isProposedSlotStillValid({ ...s, startIso: "2026-11-21T15:00:00.000Z", endIso: "2026-11-21T16:30:00.000Z" }, now)).toBe(false); // samedi
  });
});
