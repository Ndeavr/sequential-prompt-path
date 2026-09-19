/**
 * Clara conduit, elle n'oriente pas.
 * - Chaque destination existe réellement dans le routeur (aucune route inventée).
 * - Les formulations « cherchez sur le site » sont éliminées.
 * - Le placeholder de bienvenue disparaît dès que la conversation démarre.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  containsForbiddenGuidance,
  resolveClaraDestination,
  rewriteGuidance,
} from "@/services/clara/claraNavigation";
import { detectClaraWorkflowIntent } from "@/services/alexIntentClassifier";

const root = process.cwd();
const read = (relative: string) => readFileSync(path.join(root, relative), "utf8");
const router = read("src/app/router.tsx");
const box = read("src/components/home-light/ClaraConversationBox.tsx");

const INTENTS = [
  "quote_comparison",
  "quote_analysis",
  "contractor_verification",
  "contractor_onboarding",
  "affiliate_onboarding",
  "design_generation",
  "contractor_search",
] as const;

describe("Clara — destinations canoniques", () => {
  it("n'expose que des routes réellement déclarées", () => {
    for (const intent of INTENTS) {
      const destination = resolveClaraDestination(intent);
      expect(destination, intent).toBeTruthy();
      expect(router, `${intent} → ${destination!.path}`).toContain(`path="${destination!.path}"`);
    }
  });

  it("reste dans la conversation quand aucun écran dédié n'existe", () => {
    expect(resolveClaraDestination("homeowner_problem")).toBeNull();
    expect(resolveClaraDestination("general_question")).toBeNull();
  });

  it("ne navigue pas sur une intention faible", () => {
    expect(resolveClaraDestination("contractor_search", 0.2)).toBeNull();
  });

  it("amène l'utilisateur pour les demandes explicites", () => {
    expect(resolveClaraDestination(detectClaraWorkflowIntent("Je veux comparer mes soumissions").intent))
      .toMatchObject({ path: "/compare-quotes" });
    expect(resolveClaraDestination(detectClaraWorkflowIntent("Je veux devenir affilié").intent))
      .toMatchObject({ path: "/affilies/onboarding" });
  });
});

describe("Clara — aucune consigne de recherche", () => {
  it("détecte les formulations interdites", () => {
    expect(containsForbiddenGuidance("Vous pouvez chercher sur le site.")).toBe(true);
    expect(containsForbiddenGuidance("Allez dans le menu Entrepreneurs.")).toBe(true);
    expect(containsForbiddenGuidance("Rendez-vous sur la page de comparaison.")).toBe(true);
    expect(containsForbiddenGuidance("Envoyez-moi vos trois soumissions.")).toBe(false);
  });

  it("remplace la consigne par une prise en charge réelle", () => {
    const rewritten = rewriteGuidance(
      "Bien sûr. Rendez-vous sur la page de comparaison.",
      resolveClaraDestination("quote_comparison"),
    );
    expect(containsForbiddenGuidance(rewritten)).toBe(false);
    expect(rewritten).toContain("je vous y amène");
  });

  it("ne renvoie jamais chercher quand aucune destination n'existe", () => {
    const rewritten = rewriteGuidance("Cherchez sur le site.", null);
    expect(containsForbiddenGuidance(rewritten)).toBe(false);
    expect(rewritten).toBeTruthy();
  });

  it("laisse intact un message normal", () => {
    expect(rewriteGuidance("Est-ce un balcon à l'étage ?", null)).toBe("Est-ce un balcon à l'étage ?");
  });
});

describe("Clara — chat contextuel et voix unique", () => {
  it("n'affiche la salutation qu'avant la première interaction", () => {
    expect(box).toContain("const conversationStarted = messages.length > 0");
    expect(box).toContain("conversationStarted ? copy.placeholderActive : copy.placeholder");
  });

  it("ne duplique pas un énoncé vocal déjà affiché", () => {
    expect(box).toContain("last.text.trim().toLowerCase() === normalized");
  });

  it("navigue elle-même vers l'écran réel", () => {
    expect(box).toContain("resolveClaraDestination");
    expect(box).toContain("navigate(destination.path");
  });
});
