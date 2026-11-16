import { describe, it, expect } from "vitest";
import { canAnalyzePaintingPath } from "../../supabase/staged/painting-photos-guest-read/pathRules";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const G = "33333333-3333-4333-8333-333333333333";
const anon = { userId: null, isAdmin: false };

describe("painting-photos analysis authorization (synthetic)", () => {
  it("anon may analyze only its unguessable guest upload", () => {
    expect(canAnalyzePaintingPath(`guest/${G}/x.jpg`, anon)).toBe(true);
    expect(canAnalyzePaintingPath(`guest/x.jpg`, anon)).toBe(false);
    expect(canAnalyzePaintingPath(`${A}/x.jpg`, anon)).toBe(false);
  });
  it("owner A reads own folder, B cannot read A", () => {
    expect(canAnalyzePaintingPath(`${A}/x.jpg`, { userId: A, isAdmin: false })).toBe(true);
    expect(canAnalyzePaintingPath(`${A}/x.jpg`, { userId: B, isAdmin: false })).toBe(false);
  });
  it("admin may analyze any valid path", () => {
    expect(canAnalyzePaintingPath(`${A}/x.jpg`, { userId: B, isAdmin: true })).toBe(true);
  });
  it("rejects traversal and junk", () => {
    expect(canAnalyzePaintingPath(`${A}/../${B}/x.jpg`, { userId: A, isAdmin: false })).toBe(false);
    expect(canAnalyzePaintingPath(42, { userId: A, isAdmin: true })).toBe(false);
  });
});
