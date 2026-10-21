// Regression tests for the acq-e2e-real honesty fix (2026-10-21).
// The selftest previously declared "pass" while its tracked link was deleted
// by cleanup, its landing check only verified HTTP 200, its Stripe step only
// GET-ted the balance, SMS "queued" counted as delivered, and 0 funnel events
// passed. These tests lock the honest behavior in place.
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const e2e = read("supabase/functions/acq-e2e-real/index.ts");
const selftest = read("supabase/functions/acq-e2e-selftest/index.ts");
const rredirect = read("supabase/functions/r-redirect/index.ts");

describe("acq-e2e-real — lien tracké persistant avec expiration explicite", () => {
  it("ne supprime plus le lien tracké dans le cleanup immédiat", () => {
    expect(e2e).not.toContain('.from("acquisition_tracking_links").delete().eq("id", trackerId)');
  });

  it("horodate la fixture avec une expiration explicite et un nettoyage différé ciblé", () => {
    expect(e2e).toContain("e2e_expires_at");
    expect(e2e).toContain('cleanup_mode: "deferred"');
    expect(e2e).toContain("purgeExpiredFixtures");
    // La purge ne vise QUE les fixtures du selftest, jamais de vrais prospects.
    expect(e2e).toContain('.eq("campaign", "__e2e_real")');
    expect(e2e).toContain('.eq("onboarding_status", "synthetic")');
  });

  it("cleanup_completed reflète la vérification réelle du stamp", () => {
    expect(e2e).toContain("cleanup_completed: cleanupVerified");
    expect(e2e).toContain("deferred cleanup stamp not persisted");
  });
});

describe("acq-e2e-real — destination synthétique réelle et parcours public anonyme", () => {
  it("utilise la fixture QA étiquetée comme destination", () => {
    expect(e2e).toContain("qa-e2e-fixture");
    expect(e2e).toContain('QA_FIXTURE_MARKER = "Fixture QA UNPRO"');
  });

  it("vérifie le contenu de la landing, pas seulement HTTP 200", () => {
    expect(e2e).toContain("body.includes(QA_FIXTURE_MARKER)");
    expect(e2e).toContain("QA fixture marker missing");
  });

  it("exerce le clic via le résolveur public avec la clé anon (pas le service role)", () => {
    expect(e2e).toContain("outreach-shortlink-resolve");
    expect(e2e).toContain("Bearer ${ANON_KEY}");
    expect(e2e).toContain("anonymous resolve failed");
  });
});

describe("acq-e2e-real — états de livraison honnêtes", () => {
  it("le SMS queued ne compte jamais comme livré", () => {
    expect(e2e).toContain("sms_not_delivered");
    expect(e2e).toContain('lastStatus === "sent" || lastStatus === "delivered"');
    expect(e2e).toContain("TWILIO_TEST_TO");
  });

  it("le courriel « sent » est étiqueté provider_accepted, pas « livré »", () => {
    expect(e2e).toContain('delivery_state: "provider_accepted"');
  });
});

describe("acq-e2e-real — Stripe réellement TEST", () => {
  it("exige une clé TEST et refuse une clé live", () => {
    expect(e2e).toContain("STRIPE_TEST_SECRET_KEY");
    expect(e2e).toContain('STRIPE_KEY.startsWith("sk_test_")');
    expect(e2e).toContain("live keys are refused");
  });

  it("crée, relit et expire une vraie session Checkout TEST (aucun prélevement)", () => {
    expect(e2e).toContain("api.stripe.com/v1/checkout/sessions");
    expect(e2e).toContain("/expire");
    expect(e2e).toContain("livemode !== false");
    expect(e2e).toContain("charged: false");
  });

  it("un simple GET balance ne suffit plus", () => {
    expect(e2e).not.toContain("api.stripe.com/v1/balance");
  });
});

describe("acq-e2e-real — funnel cohérent obligatoire", () => {
  it("échoue si 0 événement porte le run_group", () => {
    expect(e2e).toContain("0 acquisition_events carry this run_group");
  });

  it("r-redirect propage le run_group du lien dans acquisition_events", () => {
    expect(rredirect).toContain("run_group: (link as any).metadata?.run_group ?? null");
  });
});

describe("acq-e2e-selftest — la gate ne s'ouvre pas sur des étapes critiques sautées", () => {
  it("les skips critiques bloquent l'ouverture de la gate", () => {
    expect(selftest).toContain("criticalSkips");
    expect(selftest).toContain("!failedStep && criticalSkips.length === 0");
    expect(selftest).toContain("critical steps unverified");
  });

  it("le clic est vérifié via le résolveur anonyme, pas via un 3xx sur le SPA", () => {
    expect(selftest).toContain("outreach-shortlink-resolve");
    expect(selftest).toContain("SUPABASE_ANON_KEY missing");
  });
});

describe("qa-e2e-fixture — page QA étiquetée, sans paiement ni données", () => {
  it("existe et porte le marqueur attendu", () => {
    expect(existsSync(join(root, "supabase/functions/qa-e2e-fixture/index.ts"))).toBe(true);
    const fixture = read("supabase/functions/qa-e2e-fixture/index.ts");
    expect(fixture).toContain("Fixture QA UNPRO");
    expect(fixture).toContain("noindex,nofollow");
    expect(fixture).not.toContain("stripe");
  });
});
