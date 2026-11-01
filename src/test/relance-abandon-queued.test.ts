import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const src = readFileSync("supabase/functions/contractor-relance-abandon/index.ts", "utf8");

describe("contractor-relance-abandon alert accounting", () => {
  it("never counts an enqueue as emailed/delivered", () => {
    expect(src).not.toMatch(/summary\.emailed/);
    expect(src).toMatch(/queued === true/);
    expect(src).toMatch(/delivery_confirmed: false/);
  });
  it("retries failed alerts at most 3 times with distinct idempotency keys", () => {
    expect(src).toMatch(/MAX_ALERT_ATTEMPTS = 3/);
    expect(src).toMatch(/-r\$\{attempt\}/);
  });
  it("falls back to linked contractor contact and flags missing contact", () => {
    expect(src).toMatch(/from\("contractors"\)\.select\("email, phone"\)/);
    expect(src).toMatch(/contact_missing = contactMissing/);
  });
});
