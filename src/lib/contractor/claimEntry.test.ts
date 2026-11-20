import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  activationStage,
  attributionQuery,
  isOpaqueToken,
  publicVerificationLabel,
  resolveClaimEntry,
  PROSPECT_SLUG_PREVIEW_ENABLED,
} from "./claimEntry";

const sp = (q: string) => new URLSearchParams(q);
const TOKEN = "AbCdEf0123456789_-xyz";
const row = { id: "c1", user_id: "owner", business_name: "Toitures Exemple inc.", city: "Laval", specialty: null, public_status: "published_pending_verification" };

describe("claim entry resolution", () => {
  it("unknown slug without token is an honest 404, never an invented name", () => {
    expect(resolveClaimEntry({ slug: "toitures-inventees", search: sp(""), contractor: null, viewerUserId: null })).toEqual({ kind: "not_found" });
  });

  it("a contractor row without a name is not displayable", () => {
    const r = resolveClaimEntry({ slug: "x", search: sp(""), contractor: { ...row, business_name: "  " }, viewerUserId: null });
    expect(r.kind).toBe("not_found");
  });

  it("malformed slug is not found", () => {
    expect(resolveClaimEntry({ slug: "../admin", search: sp(""), contractor: row, viewerUserId: null }).kind).toBe("not_found");
  });

  it("valid opaque token forwards to the canonical token flow, keeping only safe attribution", () => {
    const r = resolveClaimEntry({ slug: "a", search: sp(`t=${TOKEN}&utm_source=sms&email=x@y.ca`), contractor: null, viewerUserId: null });
    expect(r).toEqual({ kind: "redirect_token", path: `/unpro/activate/${TOKEN}?utm_source=sms` });
  });

  it("short or malformed tokens are ignored (no prefix expansion)", () => {
    expect(isOpaqueToken("abc")).toBe(false);
    expect(isOpaqueToken("abc def 0123456789xyz")).toBe(false);
    expect(resolveClaimEntry({ slug: "a", search: sp("t=abc"), contractor: null, viewerUserId: null }).kind).toBe("not_found");
  });

  it("another visitor (impersonation) never gets an edit path on an attached profile", () => {
    expect(resolveClaimEntry({ slug: "toitures-exemple", search: sp(""), contractor: row, viewerUserId: "stranger" }).kind).toBe("already_attached");
    expect(resolveClaimEntry({ slug: "toitures-exemple", search: sp(""), contractor: row, viewerUserId: null }).kind).toBe("already_attached");
  });

  it("the owner is recognized only by matching account id", () => {
    expect(resolveClaimEntry({ slug: "toitures-exemple", search: sp(""), contractor: row, viewerUserId: "owner" }).kind).toBe("own_profile");
  });

  it("attribution never carries PII-like keys", () => {
    expect(attributionQuery(sp("utm_campaign=allume&phone=5145550000&t=" + TOKEN))).toBe("utm_campaign=allume");
  });

  it("prospect slug preview stays off until the staged SQL is approved", () => {
    expect(PROSPECT_SLUG_PREVIEW_ENABLED).toBe(false);
  });
});

describe("verification and activation labels", () => {
  it("only verified_active is shown as verified", () => {
    expect(publicVerificationLabel("verified_active", "fr")).toBe("Vérifiée par UNPRO");
    expect(publicVerificationLabel("published_pending_verification", "fr")).toBe("Vérification en attente");
    expect(publicVerificationLabel("unpublished", "fr")).toBe("Non vérifiée");
    expect(publicVerificationLabel(null, "en")).toBe("Not verified");
  });

  it("a return from Stripe without a server-confirmed right is not paid", () => {
    expect(activationStage({ signedIn: true, contractor: { public_status: "unpublished" }, planCode: null })).toBe("claimed_payment_unconfirmed");
  });

  it("paid but unverified stays pending verification, never active", () => {
    expect(activationStage({ signedIn: true, contractor: { public_status: "published_pending_verification" }, planCode: "presence" })).toBe("paid_pending_verification");
  });

  it("active only with a server right AND verified_active", () => {
    expect(activationStage({ signedIn: true, contractor: { public_status: "verified_active" }, planCode: "presence" })).toBe("active_verified");
    expect(activationStage({ signedIn: false, contractor: null, planCode: "presence" })).toBe("signed_out");
    expect(activationStage({ signedIn: true, contractor: null, planCode: null })).toBe("no_profile");
  });
});

describe("claim surfaces stay honest", () => {
  const welcome = readFileSync("src/pages/entrepreneur/PageClaimWelcome.tsx", "utf8");
  const wizard = readFileSync("src/pages/entrepreneur/PageClaimWizard.tsx", "utf8");
  const rec = readFileSync("src/features/contractorProfile/recommendationPage/ContractorRecommendationPage.tsx", "utf8");

  it("welcome page reads server status and invents no score or delay", () => {
    expect(welcome).toContain('rpc("contractor_plan_code"');
    expect(welcome).not.toMatch(/STARTING_SCORE|3–12 jours|Profil activé|useSearchParams/);
  });

  it("claim page never derives a name from the slug nor calls a checkout", () => {
    expect(wizard).not.toMatch(/suggestedName|charAt\(0\)\.toUpperCase|claim-create-checkout|create-checkout-session/);
    expect(wizard).toContain("noindex");
  });

  it("public profile hides Clara's recommendation and indexing until verified", () => {
    expect(rec).toContain("noindex={!verified}");
    expect(rec).toContain("{verified && <AIReferenceBlock");
  });
});
