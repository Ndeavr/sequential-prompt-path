// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Source-contract only: hosted signed webhook/DB/RLS E2E is covered by P0 #86.
const edge = readFileSync(resolve("supabase/functions/activation-claim/index.ts"), "utf8");
const panel = readFileSync(resolve("src/features/activationProfile/components/ActivationClaimPanel.tsx"), "utf8");

describe("a prospect's ownership claim is not a paid activation", () => {
  it("starts unentitled and preserves existing paid or free rights", () => {
    expect(edge).toContain('activation_status: "not_ready"');
    expect(edge).not.toContain('.update({ activation_status: "activated" })');
    expect(edge).toContain('status: "claimed"');
    expect(edge).toContain('existingClaim ? { error: null }');
    expect(edge).toContain('outreach_status: "registered"');
    expect(edge).toContain('outreach_status.not.in.(paid,activated)');
  });

  it("does not emit a paid-looking profile_activated event on a claim", () => {
    expect(edge).toContain('await logEvent("profile_claimed"');
    expect(edge).not.toContain('await logEvent("profile_activated"');
    expect(panel).toContain('event_type: "profile_claimed"');
    expect(panel).not.toContain('event_type: "profile_activated"');
  });

  it("keeps the distinct free-year RPC and labels the claim accurately", () => {
    expect(edge).toContain('admin.rpc("claim_local_service_free_year"');
    expect(panel).toContain('Réclamer gratuitement ma fiche');
    expect(panel).toContain('Réclamer ma fiche');
    expect(panel).toContain('rattaché à votre compte');
    expect(panel).not.toContain('Activer mon profil gratuitement');
  });
});
