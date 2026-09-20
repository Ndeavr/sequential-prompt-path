/**
 * Parcours entrepreneur — un seul chemin, mesurable de bout en bout.
 *
 * Garde-fous : une seule entrée après Clara (analyse d'entreprise, formulaire
 * en repli), et les douze points d'abandon réellement journalisés.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  CONTRACTOR_FUNNEL_STEPS,
  CONTRACTOR_FUNNEL_STEP_LABELS,
} from "@/lib/analytics/funnelSteps";

const read = (p: string) => readFileSync(p, "utf8");

describe("Parcours entrepreneur — entrée unique", () => {
  it("les anciennes entrées redirigent vers l'audit IA en gardant l'attribution", () => {
    const router = read("src/app/router.tsx");
    for (const path of ["/entrepreneur/onboarding", "/entrepreneur/join", "/join"]) {
      expect(router).toContain(`<Route path="${path}" element={<LegacyRedirect to="/entrepreneurs/audit-ia" />} />`);
    }
  });

  it("l'entrée ouvre l'analyse d'entreprise, le formulaire restant en repli", () => {
    const entry = read("src/pages/contractor-funnel/PageContractorOnboardingEntry.tsx");
    expect(entry).toContain('PageContractorPricingIntake');
    expect(entry).toContain('searchParams.get("mode") === "formulaire"');
  });

  it("Clara conduit vers cette entrée unique, jamais vers une route parallèle", () => {
    const nav = read("src/services/clara/claraNavigation.ts");
    expect(nav).toContain('contractor_onboarding: { path: "/entrepreneurs/audit-ia"');
  });
});

describe("Parcours entrepreneur — points d'abandon", () => {
  const REQUIRED = [
    "home_contractor_click",
    "analysis_started",
    "analysis_completed",
    "profile_started",
    "profile_completed",
    "otp_requested",
    "otp_verified",
    "goals_completed",
    "plan_presented",
    "checkout_created",
    "payment_succeeded",
    "account_activated",
  ] as const;

  it("les douze étapes sont canoniques et libellées", () => {
    for (const step of REQUIRED) {
      expect(CONTRACTOR_FUNNEL_STEPS).toContain(step);
      expect(CONTRACTOR_FUNNEL_STEP_LABELS[step]).toBeTruthy();
    }
  });

  it("l'accueil journalise l'intention entrepreneur", () => {
    const box = read("src/components/home-light/ClaraConversationBox.tsx");
    expect(box).toContain('trackFunnelStep("home_contractor_click"');
  });

  it("l'analyse journalise début, reconnaissance, profil et objectifs", () => {
    const intake = read("src/pages/contractor-funnel/PageContractorPricingIntake.tsx");
    expect(intake).toContain('trackFunnelStep("analysis_started"');
    expect(intake).toContain('trackFunnelStep("company_recognized"');
    expect(intake).toContain('trackFunnelStep("analysis_completed"');
    expect(intake).toContain('trackFunnelStep("profile_started"');
    expect(intake).toContain('trackFunnelStep("profile_completed"');
    expect(intake).toContain('trackFunnelStep("goals_completed"');
  });

  it("le code de vérification est journalisé sans jamais exposer le code", () => {
    const otp = read("src/lib/auth/phoneOtp.ts");
    expect(otp).toContain('trackFunnelStep("otp_requested"');
    expect(otp).toContain('trackFunnelStep("otp_verified"');
    expect(otp).not.toMatch(/metadata:\s*\{[^}]*code/);
  });

  it("le paiement et l'activation restent journalisés côté serveur", () => {
    const webhook = read("supabase/functions/stripe-webhook/index.ts");
    expect(webhook).toContain("payment_completed:${session.id}");
    expect(webhook).toContain("contractor_activated:${session.id}");
  });
});
