import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const box = readFileSync("src/components/home-light/ClaraConversationBox.tsx", "utf8");
const session = readFileSync("src/services/clara/claraSession.ts", "utf8");
const fn = readFileSync("supabase/functions/clara-session/index.ts", "utf8");

describe("Clara — nouvelle conversation", () => {
  it("expose un bouton discret accessible", () => {
    expect(box).toContain('className="home-clara-reset"');
    expect(box).toContain("aria-label={copy.reset}");
    expect(box).toContain("Nouvelle conversation");
  });

  it("confirme seulement si la conversation contient des messages", () => {
    expect(box).toContain("if (messages.length === 0 && mediaItems.length === 0)");
    expect(box).toContain("Commencer une nouvelle conversation ?");
  });

  it("coupe la voix et vide l'état local avant de repartir", () => {
    expect(box).toContain("closeAlex()");
    expect(box).toContain("clearMedia()");
    expect(box).toContain("setMessages([])");
  });

  it("crée une VRAIE nouvelle session canonique (nouveau jeton, sans reprise)", () => {
    expect(session).toContain("export async function startNewClaraSession");
    expect(session).toContain("force_new: true");
    expect(fn).toContain("const forceNew = body.force_new === true");
    expect(fn).toContain("!forceNew && !session && userId");
  });

  it("ne touche ni au compte ni aux données permanentes", () => {
    expect(box).not.toContain("signOut");
    expect(session).not.toContain("signOut");
  });
});
