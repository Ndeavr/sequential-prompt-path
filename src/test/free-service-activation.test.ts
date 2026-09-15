/**
 * Activation gratuite atomique — garde-fous P0.
 *  - aucune référence Stripe sur le chemin gratuit ;
 *  - le contexte survit à l'OTP / au retour OAuth / au refresh ;
 *  - `profile_activated` seulement après confirmation serveur ;
 *  - offre indisponible = état normal, pas une erreur.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const invoke = vi.fn();
const logged: Array<{ event_type: string }> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({
  logFunnelEvent: (input: { event_type: string }) => {
    logged.push(input);
    return Promise.resolve();
  },
}));

import {
  buildFreeActivationContext,
  freeActivationMessage,
  runFreeServiceActivation,
} from "@/lib/activation/freeServiceActivation";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

beforeEach(() => {
  invoke.mockReset();
  logged.length = 0;
});

describe("contexte d'activation", () => {
  it("lit l'URL tokenisée (prospect, ville, métier)", () => {
    const ctx = buildFreeActivationContext(
      "?p=11111111-1111-1111-1111-111111111111&ville=Laval&metier=nettoyage&utm_source=sms",
    );
    expect(ctx.prospectId).toBe("11111111-1111-1111-1111-111111111111");
    expect(ctx.city).toBe("Laval");
    expect(ctx.trade).toBe("nettoyage");
    expect(ctx.utm.utm_source).toBe("sms");
  });

  it("retombe sur l'intention persistée après un retour OAuth sans paramètres", () => {
    const ctx = buildFreeActivationContext("", {
      rawRole: "contractor",
      role: "contractor",
      accountType: "contractor",
      prospectId: "22222222-2222-2222-2222-222222222222",
      businessName: "Nettoyage Rive-Sud",
      city: "Brossard",
      trade: "nettoyage",
      attribution: { utm_campaign: "free_year" },
      timestamp: Date.now(),
    });
    expect(ctx.prospectId).toBe("22222222-2222-2222-2222-222222222222");
    expect(ctx.businessName).toBe("Nettoyage Rive-Sud");
    expect(ctx.city).toBe("Brossard");
    expect(ctx.utm.utm_campaign).toBe("free_year");
  });
});

describe("exécution", () => {
  it("émet profile_activated seulement quand le serveur confirme", async () => {
    invoke.mockResolvedValue({
      data: {
        ok: true,
        activated: true,
        contractor_id: "c1",
        prospect_id: "p1",
        membership_id: "m1",
        onboarding_session_id: "s1",
        founder_end: "2027-09-15T00:00:00Z",
        checkout_created: false,
      },
      error: null,
    });
    const res = await runFreeServiceActivation({ city: "Laval", trade: "nettoyage" });
    expect(res.kind).toBe("activated");
    const types = logged.map((e) => e.event_type);
    expect(types).toEqual([
      "free_activation_started",
      "profile_claimed",
      "free_year_entitlement_created",
      "profile_activated",
      "onboarding_resumed",
    ]);
  });

  it("n'émet jamais profile_activated quand l'offre est pleine", async () => {
    invoke.mockResolvedValue({
      data: { ok: false, kind: "not_eligible", failure_code: "city_full" },
      error: null,
    });
    const res = await runFreeServiceActivation({ city: "Laval", trade: "nettoyage" });
    expect(res).toEqual({ kind: "not_eligible", reason: "city_full" });
    expect(logged.map((e) => e.event_type)).not.toContain("profile_activated");
    expect(logged.map((e) => e.event_type)).toContain("free_year_unavailable");
    expect(freeActivationMessage(res)).toContain("places gratuites");
  });

  it("échec technique : erreur récupérable, aucune conversion comptée", async () => {
    invoke.mockResolvedValue({
      data: { ok: false, kind: "error", failure_step: "free_activation_transaction", failure_code: "db_error" },
      error: null,
    });
    const res = await runFreeServiceActivation({ city: "Laval", trade: "nettoyage" });
    expect(res.kind).toBe("error");
    const types = logged.map((e) => e.event_type);
    expect(types).toContain("activation_error");
    expect(types).not.toContain("profile_activated");
    expect(types).not.toContain("free_year_entitlement_created");
  });
});

describe("aucun Stripe sur le chemin gratuit", () => {
  const files = [
    "src/lib/activation/freeServiceActivation.ts",
    "src/pages/join/PageContractorJoinProfileGate.tsx",
    "supabase/functions/free-service-activate/index.ts",
  ];

  it.each(files)("%s n'appelle aucun objet Stripe ni checkout", (file) => {
    const src = read(file).toLowerCase();
    // Les commentaires peuvent nommer Stripe ; aucun appel ne doit exister.
    expect(src).not.toContain("esm.sh/stripe");
    expect(src).not.toContain("new stripe(");
    expect(src).not.toContain("stripe_secret_key");
    expect(src).not.toContain("create-checkout-session");
    expect(src).not.toContain("checkout.sessions");
    expect(src).not.toMatch(/from\(["']checkout_sessions["']\)/);
  });

  it("la fonction serveur dérive l'utilisateur du JWT, jamais du corps", () => {
    const src = read("supabase/functions/free-service-activate/index.ts");
    expect(src).toContain("auth.getUser()");
    expect(src).toContain("_user_id: user.id");
    expect(src).not.toContain("body.user_id");
  });

  it("le chemin gratuit passe par la transaction canonique existante", () => {
    const src = read("supabase/functions/free-service-activate/index.ts");
    expect(src).toContain("activate_free_service_account_from_context");
  });
});

describe("chemin zéro dollar hérité", () => {
  it("n'écrit plus de colonnes inexistantes et ne masque plus l'échec", () => {
    const src = read("supabase/functions/create-checkout-session/index.ts");
    expect(src).not.toMatch(/status:\s*"active",\s*\n\s*subscription_plan:/);
    expect(src).toContain("zero_total_activation_failed");
  });
});
