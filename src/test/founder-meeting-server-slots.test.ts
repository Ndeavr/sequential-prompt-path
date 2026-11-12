import { describe, expect, it } from "vitest";
import { candidateSlots, isValidCandidate, pickFreeSlots, wallToUtc } from "../../supabase/functions/founder-meeting/slots";

const NOW = new Date("2026-11-12T21:00:00Z"); // jeudi 16 h, Montréal

describe("Serveur — créneaux libres fondateur", () => {
  it("3 prochains libres, 90 min, débuts 10:00/11:30/13:00 locaux, jours ouvrables, ≥ 24 h", () => {
    const s = pickFreeSlots(NOW, []);
    expect(s.map((x) => x.start)).toEqual(["2026-11-16T15:00:00.000Z", "2026-11-16T16:30:00.000Z", "2026-11-16T18:00:00.000Z"]);
    for (const x of candidateSlots(NOW)) {
      expect(Date.parse(x.end) - Date.parse(x.start)).toBe(90 * 60_000);
      expect(Date.parse(x.start)).toBeGreaterThanOrEqual(NOW.getTime() + 24 * 3600_000);
      const local = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto", hourCycle: "h23", weekday: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(x.start));
      expect(local).toMatch(/^(Mon|Tue|Wed|Thu|Fri),? (10:00|11:30|13:00)$/);
    }
  });

  it("occupation Google (événement d'une journée ou vacances) : le jour entier est sauté", () => {
    const allDay = { start: "2026-11-16T05:00:00Z", end: "2026-11-17T05:00:00Z" };
    expect(pickFreeSlots(NOW, [allDay])[0].start).toBe("2026-11-17T15:00:00.000Z");
  });

  it("chevauchement partiel exclu, contigu accepté", () => {
    const busy = [{ start: "2026-11-16T16:00:00Z", end: "2026-11-16T16:30:00Z" }]; // 11:00–11:30
    expect(pickFreeSlots(NOW, busy).map((x) => x.start)).toEqual(["2026-11-16T16:30:00.000Z", "2026-11-16T18:00:00.000Z", "2026-11-17T15:00:00.000Z"]);
  });

  it("rendez-vous UNPRO déjà réservé = occupé (pas de double réservation)", () => {
    const held = { start: "2026-11-16T15:00:00+00:00", end: "2026-11-16T16:30:00+00:00" };
    expect(pickFreeSlots(NOW, [held])[0].start).toBe("2026-11-16T16:30:00.000Z");
  });

  it("DST : 10 h = 14:00Z le 30 oct., 15:00Z le 2 nov. 2026; 17:00Z à 13 h le 15 mars 2027", () => {
    expect(new Date(wallToUtc(2026, 10, 30, 10, 0)).toISOString()).toBe("2026-10-30T14:00:00.000Z");
    expect(new Date(wallToUtc(2026, 11, 2, 10, 0)).toISOString()).toBe("2026-11-02T15:00:00.000Z");
    expect(new Date(wallToUtc(2027, 3, 15, 13, 0)).toISOString()).toBe("2027-03-15T17:00:00.000Z");
    const s = pickFreeSlots(new Date("2026-10-29T12:00:00Z"), [], 6);
    expect(s[3].start).toBe("2026-11-02T15:00:00.000Z");
  });

  it("validation serveur : samedi, 14 h, < 24 h ou heure arbitraire refusés", () => {
    expect(isValidCandidate("2026-11-16T16:30:00.000Z", NOW)?.end).toBe("2026-11-16T18:00:00.000Z");
    expect(isValidCandidate("2026-11-21T15:00:00.000Z", NOW)).toBeNull();
    expect(isValidCandidate("2026-11-16T19:00:00.000Z", NOW)).toBeNull();
    expect(isValidCandidate("2026-11-13T15:00:00.000Z", NOW)).toBeNull();
    expect(isValidCandidate("pas une date", NOW)).toBeNull();
  });
});
