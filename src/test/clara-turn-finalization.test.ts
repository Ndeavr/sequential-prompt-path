import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { extractQuickReplies } from "@/components/home-light/ClaraConversationBox";

const source = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const css = readFileSync("src/index.css", "utf8");

describe("Clara — finalisation du tour de conversation", () => {
  it("rend le texte assistant lisible sur le panneau clair", () => {
    expect(source).toContain("home-clara-message");
    expect(css).toContain(".home-light .home-clara-conversation .home-clara-message.home-clara-message");
    expect(css).toMatch(/home-clara-message\.home-clara-message[^}]*opacity: 1/s);
  });

  it("ne garde aucune animation de traitement au repos", () => {
    // L'indicateur n'est animé que lorsque l'état busy est actif.
    expect(source).toContain('`home-clara-presence${busy ? " is-active" : ""}`');
    expect(css).toContain(".home-light .home-clara-presence.is-active span");
    const idleBlock = css.slice(
      css.indexOf(".home-light .home-clara-presence span,"),
      css.indexOf(".home-light .home-clara-presence.is-active span"),
    );
    expect(idleBlock).toContain("animation: none");
  });

  it("réactive et refocalise le champ après chaque tour, y compris en erreur", () => {
    expect(source).toContain("focusComposer();");
    expect(source).toMatch(/finally \{[^}]*setBusy\(false\)/s);
    expect(source).toContain("textarea.disabled = false");
  });

  it("garde la même conversation pour un second message", () => {
    // Aucun redémarrage de session entre deux tours : seule la session canonique est utilisée.
    expect(source).toContain("appendClaraMessage");
    expect(source).not.toContain("startOrResumeClaraSession({ language: lang, entrypoint: \"home_clara_box\" });\n      }, [");
  });
});

describe("Clara — réponses rapides", () => {
  it("extrait les choix fermés et retire le marqueur du texte affiché", () => {
    const { text, options } = extractQuickReplies(
      "Votre balcon est en quel matériau ?\n[[CHOIX: Bois | Béton | Fibre de verre | Je ne sais pas]]",
    );
    expect(text).toBe("Votre balcon est en quel matériau ?");
    expect(options).toEqual(["Bois", "Béton", "Fibre de verre", "Je ne sais pas"]);
  });

  it("laisse le texte intact quand la question est ouverte", () => {
    const { text, options } = extractQuickReplies("Décrivez-moi la situation.");
    expect(text).toBe("Décrivez-moi la situation.");
    expect(options).toEqual([]);
  });

  it("limite à six options", () => {
    const { options } = extractQuickReplies("Q\n[[CHOIX: 1 | 2 | 3 | 4 | 5 | 6 | 7]]");
    expect(options).toHaveLength(6);
  });

  it("envoie le choix comme un vrai message utilisateur", () => {
    expect(source).toContain("chooseQuickReply");
    expect(source).toMatch(/chooseQuickReply[\s\S]*void send\(option\)/);
    expect(source).toMatch(/\/\^autre\$\/i\.test\(option\)/);
  });
});
