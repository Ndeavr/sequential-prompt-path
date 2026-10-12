import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  isContractorConversationTurn, mapRbqAnswer, isAmbiguousRbqAnswer, CLARA_RBQ_QUICK_REPLIES,
} from "@/services/clara/claraContractorQualification";
import { RBQ_DECLARATION_OPTIONS } from "@/lib/compliance/rbqDeclaration";

const box = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");

describe("Clara — rôle entrepreneur persistant", () => {
  it("« inscrire mon entreprise » ouvre le parcours entrepreneur", () => {
    expect(isContractorConversationTurn("je veux inscrire mon entreprise")).toBe(true);
  });
  it("« Oui, je suis propriétaire » après une question sur l'entreprise reste entrepreneur", () => {
    expect(isContractorConversationTurn("Oui, je suis propriétaire",
      "Êtes-vous le propriétaire ou le gestionnaire de cette entreprise ?")).toBe(true);
  });
  it("un propriétaire maison sans contexte entreprise reste propriétaire", () => {
    expect(isContractorConversationTurn("Oui, je suis propriétaire", "Depuis quand voyez-vous cette infiltration ?")).toBe(false);
    expect(isContractorConversationTurn("Mon toit coule chez moi")).toBe(false);
  });
  it("le Dossier maison ne s'ouvre jamais sur un tour entrepreneur", () => {
    expect(box).toMatch(/audienceRef\.current === "homeowner"\s*&& !contractorTurn\s*&& mentionsDossier/);
  });
});

describe("Clara — 6 situations RBQ existantes", () => {
  it("propose exactement les 6 libellés de « Mon profil »", () => {
    expect(CLARA_RBQ_QUICK_REPLIES).toEqual(RBQ_DECLARATION_OPTIONS.map((o) => o.label));
    expect(CLARA_RBQ_QUICK_REPLIES).toHaveLength(6);
  });
  it("« Je n'ai pas de licence » est ambigu : choix proposés, jamais « suspendue »", () => {
    expect(mapRbqAnswer("Je n'ai pas de licence")).toBeNull();
    expect(isAmbiguousRbqAnswer("Je n'ai pas de licence")).toBe(true);
    expect(isAmbiguousRbqAnswer("Non, pas en main")).toBe(true);
  });
  it("mappe choix rapides et réponses naturelles vers les statuts existants", () => {
    for (const o of RBQ_DECLARATION_OPTIONS) expect(mapRbqAnswer(o.label)).toBe(o.value);
    expect(mapRbqAnswer("Mon activité ne requiert pas de licence")).toBe("not_required");
    expect(mapRbqAnswer("Je travaille pour une entreprise licenciée")).toBe("employer_licensed");
    expect(mapRbqAnswer("en cours d'obtention")).toBe("in_progress");
  });
});

describe("Clara — clavier et choix stables", () => {
  it("ne rouvre jamais le clavier d'elle-même et garde le focus sur un choix", () => {
    expect(box).toContain("if (!composerEngagedRef.current || document.activeElement === textarea) return;");
    expect(box).toContain("onPointerDown={(event) => { if (composerEngagedRef.current) event.preventDefault(); }}");
  });
  it("choix rapides séquentiels avec mouvement réduit respecté", () => {
    const css = readFileSync("src/index.css", "utf8");
    expect(css).toContain("animation-delay: calc(380ms + var(--chip-index, 0) * 140ms)");
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{\s*\.home-clara-quick button\[data-stagger="true"\]/);
  });
});
