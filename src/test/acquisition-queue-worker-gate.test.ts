import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  evaluateOutreachFlag,
  workerSideEffectDecision,
} from "../../supabase/functions/_shared/outreachGate";

const workerSrc = readFileSync(
  "supabase/functions/acquisition-queue-worker/index.ts",
  "utf8",
);

describe("acquisition-queue-worker — décision d'entrée (avant tout effet de bord)", () => {
  it("verrou fermé => blocked : zéro mutation, zéro provider", () => {
    const gate = evaluateOutreachFlag(false);
    expect(gate.allowed).toBe(false);
    expect(workerSideEffectDecision(gate, false)).toBe("blocked");
  });

  it("verrou illisible ou absent => blocked (fail-closed)", () => {
    expect(
      workerSideEffectDecision(evaluateOutreachFlag(undefined, new Error("db_down")), false),
    ).toBe("blocked");
    expect(workerSideEffectDecision(evaluateOutreachFlag(null), false)).toBe("blocked");
    expect(workerSideEffectDecision(evaluateOutreachFlag(undefined), false)).toBe("blocked");
  });

  it("dry_run reste un aperçu sans écriture, verrou ouvert ou fermé", () => {
    expect(workerSideEffectDecision(evaluateOutreachFlag(false), true)).toBe("dry_run_preview");
    expect(workerSideEffectDecision(evaluateOutreachFlag(true), true)).toBe("dry_run_preview");
  });

  it("verrou ouvert => comportement normal inchangé", () => {
    expect(workerSideEffectDecision(evaluateOutreachFlag(true), false)).toBe("proceed");
  });
});

describe("acquisition-queue-worker — ordre de vérification dans le code", () => {
  it("le verrou est lu et appliqué AVANT la réparation et le premier upsert", () => {
    const gateRead = workerSrc.indexOf("workerSideEffectDecision(outreachGate, dryRun)");
    const earlyReturn = workerSrc.indexOf('=== "blocked"');
    const repair = workerSrc.indexOf("detectAndRepairDeadQueue(supabase)");
    const firstUpsert = workerSrc.indexOf('.from("acquisition_queue").upsert(');
    expect(gateRead).toBeGreaterThan(-1);
    expect(earlyReturn).toBeGreaterThan(-1);
    expect(repair).toBeGreaterThan(-1);
    expect(firstUpsert).toBeGreaterThan(-1);
    expect(gateRead).toBeLessThan(repair);
    expect(earlyReturn).toBeLessThan(repair);
    expect(gateRead).toBeLessThan(firstUpsert);
  });

  it("le verrou n'est lu qu'une seule fois par exécution", () => {
    const calls = workerSrc.split("assertOutreachEnabled(supabase").length - 1;
    expect(calls).toBe(1);
  });

  it("la réponse bloquée n'écrit rien : aucun emitEvent/upsert entre le verrou et le retour", () => {
    const gateRead = workerSrc.indexOf("workerSideEffectDecision(outreachGate, dryRun)");
    const repair = workerSrc.indexOf("detectAndRepairDeadQueue(supabase)");
    const between = workerSrc.slice(gateRead, repair);
    expect(between).toContain("blocked: true");
    expect(between).not.toContain("emitEvent(");
    expect(between).not.toContain(".upsert(");
    expect(between).not.toContain(".update(");
    expect(between).not.toContain(".insert(");
  });

  it("les garde-fous existants sont préservés (423 agent-send-outreach, webhook fail-closed)", () => {
    const sendOutreach = readFileSync("supabase/functions/agent-send-outreach/index.ts", "utf8");
    expect(sendOutreach).toContain("423");
    const webhook = readFileSync("supabase/functions/stripe-webhook/index.ts", "utf8");
    expect(webhook).toContain("webhookEntryDecision");
    // Le garde-fou d'envoi tardif du worker (lookups/envois) reste en place.
    expect(workerSrc).toContain("!outreachGate.allowed");
  });
});
