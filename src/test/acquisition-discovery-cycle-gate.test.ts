/**
 * Régression P0 (25 oct. 2026) : le cron `unpro-acquisition-discovery-6h`
 * consommait des appels Google Places et alimentait acquisition_queue alors
 * que recruitment_controls.global_enabled=false et
 * autonomous_enqueue_enabled=false, et la provenance était enregistrée
 * 'manual' parce que le code lisait une valeur du corps client.
 *
 * Invariants sous test :
 *  - verrous de recrutement fermés/illisibles => blocage avant tout appel
 *    externe, toute écriture de run et tout import ;
 *  - aucun appel anonyme ne peut déclencher la découverte ;
 *  - la provenance est dérivée de l'authentification, jamais du corps client ;
 *  - le dry_run reste un aperçu lecture seule qui rapporte l'état du verrou.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  evaluateRecruitmentLocks,
  resolveTriggerSource,
} from "../../supabase/functions/_shared/recruitmentLocks";

const src = readFileSync("supabase/functions/acquisition-discovery-cycle/index.ts", "utf8");

describe("recruitmentLocks — décision fail-closed", () => {
  it("global_enabled=false => bloqué, zéro appel externe, zéro import", () => {
    const d = evaluateRecruitmentLocks({ global_enabled: false, autonomous_enqueue_enabled: true });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("recruitment_global_disabled");
  });

  it("autonomous_enqueue_enabled=false => bloqué", () => {
    const d = evaluateRecruitmentLocks({ global_enabled: true, autonomous_enqueue_enabled: false });
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("autonomous_enqueue_disabled");
  });

  it("ligne absente ou illisible => bloqué (fail-closed)", () => {
    expect(evaluateRecruitmentLocks(null).allowed).toBe(false);
    expect(evaluateRecruitmentLocks(undefined).allowed).toBe(false);
    const d = evaluateRecruitmentLocks(null, new Error("db_down"));
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("recruitment_controls_unreadable");
  });

  it("les deux verrous ouverts => autorisé", () => {
    const d = evaluateRecruitmentLocks({ global_enabled: true, autonomous_enqueue_enabled: true });
    expect(d.allowed).toBe(true);
    expect(d.reason).toBeNull();
  });
});

describe("recruitmentLocks — provenance de déclenchement", () => {
  it("un appelant service authentifié peut déclarer cron", () => {
    expect(resolveTriggerSource("service", "cron")).toBe("cron");
  });

  it("un appelant service sans indice cron est 'service'", () => {
    expect(resolveTriggerSource("service", undefined)).toBe("service");
    expect(resolveTriggerSource("service", "manual")).toBe("service");
  });

  it("un admin authentifié est toujours 'admin_manual', même avec un indice cron", () => {
    expect(resolveTriggerSource("admin", "cron")).toBe("admin_manual");
    expect(resolveTriggerSource("admin", undefined)).toBe("admin_manual");
  });

  it("une valeur client seule n'est jamais une preuve : le handler exige l'auth avant toute lecture du corps", () => {
    const handler = src.slice(src.indexOf("Deno.serve("));
    const authCall = handler.indexOf("requireAdminCaller(req");
    const bodyRead = handler.indexOf("await req.json()");
    expect(authCall).toBeGreaterThan(-1);
    expect(bodyRead).toBeGreaterThan(-1);
    expect(authCall).toBeLessThan(bodyRead);
  });
});

describe("acquisition-discovery-cycle — ordre des gardes dans le code", () => {
  it("l'authentification est exigée pour tout appel, pas seulement le ciblage", () => {
    const handler = src.slice(src.indexOf("Deno.serve("));
    expect(handler).toContain("requireAdminCaller(req, corsHeaders, \"acquisition-discovery-cycle\")");
    // L'ancien contrôle conditionnel (seulement si city/queries) a disparu.
    expect(handler).not.toContain("if (targetCity || targetQueries.length > 0) {");
  });

  it("les verrous de recrutement sont évalués avant la campagne, le circuit, le run insert et la boucle fetch", () => {
    const handler = src.slice(src.indexOf("Deno.serve("));
    const locks = handler.indexOf("evaluateRecruitmentLocks(controls, ctrlErr)");
    const campaign = handler.indexOf("freeCampaignStatus(supabase)");
    const circuit = handler.indexOf('from("provider_circuit_state")');
    const runInsert = handler.indexOf('from("acquisition_discovery_runs")');
    const scrapeFetch = handler.indexOf("acq-scrape-google-places");
    const importFetch = handler.indexOf("import-contractors");
    for (const later of [campaign, circuit, runInsert, scrapeFetch, importFetch]) {
      expect(locks).toBeGreaterThan(-1);
      expect(later).toBeGreaterThan(-1);
      expect(locks).toBeLessThan(later);
    }
  });

  it("verrous fermés => retour bloqué sans dry_run, avec motif explicite", () => {
    expect(src).toContain("if (!locks.allowed && !dryRun)");
    expect(src).toContain("blocked_reason: locks.reason");
  });

  it("le dry_run rapporte l'état du verrou sans le contourner", () => {
    expect(src).toContain("recruitment_locked: !locks.allowed");
    expect(src).toContain("recruitment_lock_reason:");
  });

  it("la provenance enregistrée vient de resolveTriggerSource, pas du corps client brut", () => {
    expect(src).toContain("resolveTriggerSource(caller.kind");
    expect(src).not.toContain('String((body as any).caller ?? "manual")');
    expect(src).toContain("trigger_source: trigger");
  });
});
