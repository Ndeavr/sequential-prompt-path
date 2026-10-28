import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { shouldOfferHomeownerRegistration } from "@/services/clara/claraPropertyRegistrationOpportunity";

const user = (text: string) => ({ role: "user" as const, text });
const clara = (text: string) => ({ role: "assistant" as const, text });

describe("Clara homepage — contextual property/account actions", () => {
  it("does not advertise registration on the blank greeting or ordinary homeowner requests", () => {
    expect(shouldOfferHomeownerRegistration([])).toBe(false);
    expect(shouldOfferHomeownerRegistration([clara("Bonjour ! Que voulez-vous améliorer, rénover ou réparer ?")])).toBe(false);
    expect(shouldOfferHomeownerRegistration([user("Je cherche un courtier immobilier")])).toBe(false);
    expect(shouldOfferHomeownerRegistration([user("J’ai un projet de rénovation")])).toBe(false);
    expect(shouldOfferHomeownerRegistration([user("Nettoyer mes conduits d’air")])).toBe(false);
  });

  it("offers an existing registration action only for an explicit homeowner request", () => {
    expect(shouldOfferHomeownerRegistration([user("Je veux enregistrer ma propriété.")])).toBe(true);
    expect(shouldOfferHomeownerRegistration([user("J’aimerais créer mon compte UNPRO.")])).toBe(true);
    expect(shouldOfferHomeownerRegistration([user("Créer mon passeport maison")])).toBe(true);
    expect(shouldOfferHomeownerRegistration([user("I want to register my property")])).toBe(true);
    expect(shouldOfferHomeownerRegistration([user("I want to create my account")])).toBe(true);
    expect(shouldOfferHomeownerRegistration([user("Je ne veux pas créer mon compte maintenant")])).toBe(false);
  });

  it("responds to an actual Clara invitation, then clears stale prompts when topic changes", () => {
    const offered = [user("Mon projet avance"), clara("Vous pouvez enregistrer votre propriété maintenant.")];
    expect(shouldOfferHomeownerRegistration(offered)).toBe(true);
    expect(shouldOfferHomeownerRegistration([...offered, user("Oui")])).toBe(true);
    expect(shouldOfferHomeownerRegistration([...offered, user("Parlons plutôt de peinture")])).toBe(false);
    expect(shouldOfferHomeownerRegistration([...offered, user("Parlons plutôt de peinture"), clara("Quel est votre budget ?")])).toBe(false);
    expect(shouldOfferHomeownerRegistration([])).toBe(false); // fresh conversation
  });

  it("guards the real CTA behind homeowner context, never the initial three options", () => {
    const source = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
    expect(source).toContain("const showPropertyRegistration = audience === \"homeowner\"");
    expect(source).toContain("&& !showIntentSuggestions");
    expect(source).toContain("shouldOfferHomeownerRegistration(messages)");
    expect(source).toContain("{showPropertyRegistration && <RegisterPropertyCTA lang={lang} />}");
    expect(source).not.toContain('{audience === "homeowner" && <RegisterPropertyCTA');
    const labels = ["Je cherche un courtier immobilier", "Nettoyer mes conduits d’air", "Je suis entrepreneur"];
    const defaults = source.slice(source.indexOf("const DEFAULT_INTENT_SUGGESTIONS"), source.indexOf("/** Public détecté"));
    for (const [index, label] of labels.entries()) expect(defaults.indexOf(label)).toBeGreaterThan(index === 0 ? -1 : defaults.indexOf(labels[index-1]));
    expect(defaults).toContain('intent: "contractor_onboarding"');
    expect(source).toContain('if (suggestion.intent === "contractor_onboarding")');
  });
});
