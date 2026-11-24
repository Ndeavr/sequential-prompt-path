// @vitest-environment node
// Purely local/synthetic: no provider, no DB, no network.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  QUESTION_TOKEN, questionAt, resolveTimeAwareQuestion, renderTimeAwareFirstSmsDraft, nextQuestionSlotStart,
} from "../../supabase/staged/time-aware-first-sms/timeAwareFirstSms";
import { buildSmsGreeting, validateSmsBody } from "../../supabase/functions/_shared/smsGreeting";
import { prepareColdOutreachSms } from "../../supabase/functions/_shared/smsEncoding";

// 2026-11-24 is EST (UTC-5): 08:00 Toronto = 13:00Z.
const at = (hhmm: string) => new Date(`2026-11-24T${hhmm}:00-05:00`);
const TODAY = "Vous auriez 5 minutes aujourd'hui pour en discuter?";
const PM = "Vous auriez 5 minutes cet après-midi pour en discuter?";
const TOMORROW = "Vous auriez 5 minutes demain pour en discuter?";

describe("question d'appel selon l'heure locale d'envoi (America/Toronto)", () => {
  it.each([
    ["07:59", null], ["08:00", TODAY], ["10:59", TODAY], ["11:00", PM],
    ["15:59", PM], ["16:00", TOMORROW], ["18:59", TOMORROW], ["19:00", null],
  ])("%s → %s", (hhmm, expected) => {
    expect(questionAt(at(hhmm))).toBe(expected);
  });

  it("utilise l'heure de Toronto, pas l'heure UTC du serveur (EDT l'été)", () => {
    expect(questionAt(new Date("2026-07-15T12:30:00Z"))).toBe(TODAY); // 08:30 EDT
    expect(questionAt(new Date("2026-07-15T11:59:00Z"))).toBeNull(); // 07:59 EDT
  });
});

describe("report et recalcul à l'instant d'envoi", () => {
  const draft = renderTimeAwareFirstSmsDraft({ greeting: buildSmsGreeting({ company_name: "Toitures Exemple" }), sender_first_name: "Yan" });

  it("19:00 : aucun envoi, report au lendemain 08:00 au plus tôt; la phrase est recalculée au nouvel instant", () => {
    const deferred = resolveTimeAwareQuestion(draft, at("19:00"));
    expect(deferred.ok).toBe(false);
    expect((deferred as { not_before?: string }).not_before).toBe("2026-11-25T13:00:00.000Z");
    // Le brouillon conserve le jeton : la question n'est pas figée au moment de la rédaction.
    expect(draft).toContain(QUESTION_TOKEN);
    // Reprise à 09:00 (fenêtre SMS existante) → « aujourd'hui », plus « demain ».
    const resumed = resolveTimeAwareQuestion(draft, new Date("2026-11-25T09:00:00-05:00"));
    expect(resumed.ok && resumed.body).toContain(TODAY);
    expect(resumed.ok && resumed.body).not.toContain(QUESTION_TOKEN);
  });

  it("avant 8 h le même jour, reprend à 08:00 le même jour", () => {
    expect(nextQuestionSlotStart(at("07:59")).toISOString()).toBe("2026-11-24T13:00:00.000Z");
  });
});

describe("rédaction", () => {
  it("prénom fiable → « Bonjour Marc, ici Yan d'UNPRO », avec STOP et coordonnées LCAP", () => {
    const r = resolveTimeAwareQuestion(renderTimeAwareFirstSmsDraft({ greeting: buildSmsGreeting({ first_name: "marc" }), sender_first_name: "Yan" }), at("11:00"));
    expect(r.ok && r.body.startsWith("Bonjour Marc, ici Yan d'UNPRO (unpro.ca).")).toBe(true);
    expect(r.ok && r.body).toContain("STOP pour ne plus être contacté.");
    expect(r.ok && r.body).toContain("281, rue Saint-Paul, Montréal H2Y 1H1");
    expect(r.ok && validateSmsBody(r.body, { commercial: true }).ok).toBe(true);
  });

  it("sans prénom ni entreprise : salutation naturelle sans crochets, acceptée par le contrôle existant", () => {
    const r = resolveTimeAwareQuestion(renderTimeAwareFirstSmsDraft({ greeting: buildSmsGreeting({}), sender_first_name: "[Prénom]" }), at("08:00"));
    expect(r.ok && r.body.startsWith("Bonjour à vous, ici UNPRO (unpro.ca).")).toBe(true);
    expect(r.ok && /[[\]]/.test(r.body)).toBe(false);
    expect(r.ok && validateSmsBody(r.body, { commercial: true }).ok).toBe(true);
  });

  it("le texte de base dépasse 1 segment : le contrôle prospection existant le refuse (non assoupli)", () => {
    const r = resolveTimeAwareQuestion(renderTimeAwareFirstSmsDraft({ greeting: buildSmsGreeting({ first_name: "Marc" }), sender_first_name: "Yan" }), at("08:00"));
    const cold = prepareColdOutreachSms(r.ok ? r.body : "");
    expect(cold.ok).toBe(false);
    expect(cold.issues).toContain("exceeds_one_segment");
  });

  it("le correctif préparé bloque tout jeton [MAJUSCULES] non résolu dans validateSmsBody", () => {
    const patch = readFileSync("supabase/staged/time-aware-first-sms/time-aware-first-sms.patch", "utf8");
    expect(patch).toContain("+  if (/\\{\\{[^}]*\\}\\}|\\$\\{[^}]*\\}|\\{[a-z_]+\\}|%[a-z_]+%|\\[[A-Z_]{3,}\\]/i.test(s))");
  });
});
