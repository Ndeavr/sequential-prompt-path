import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const box = fs.readFileSync(path.join(root, "src/components/home-light/ClaraConversationBox.tsx"), "utf8");
const hero = fs.readFileSync(path.join(root, "src/components/home-light/HeroHomeownerLight.tsx"), "utf8");
const header = fs.readFileSync(path.join(root, "src/components/navigation/SmartHeader.tsx"), "utf8");
const css = fs.readFileSync(path.join(root, "src/index.css"), "utf8");
const queue = fs.readFileSync(path.join(root, "src/services/clara/claraMediaQueue.ts"), "utf8");
const upload = fs.readFileSync(path.join(root, "src/services/alexUploadService.ts"), "utf8");

describe("Clara mobile — conversation compacte", () => {
  it("partage une activation locale entre Clara, le hero et le header", () => {
    expect(box).toContain("clara:conversation-active");
    expect(box).toContain("clara_conversation_activated");
    expect(hero).toContain("onConversationActiveChange={setIsConversationActive}");
    expect(header).toContain("homeConversationActive");
  });

  it("mesure visualViewport resize et scroll avec nettoyage", () => {
    expect(box).toContain("window.visualViewport");
    expect(box).toContain('viewport?.addEventListener("resize", updateViewport)');
    expect(box).toContain('viewport?.addEventListener("scroll", updateViewport)');
    expect(box).toContain('viewport?.removeEventListener("resize", updateViewport)');
    expect(css).toContain("--clara-visible-height");
  });

  it("garde le composer compact et extensible jusqu’à cinq lignes environ", () => {
    expect(box).toContain('rows={1}');
    expect(box).toContain("Math.min(field.scrollHeight, 120)");
    expect(css).toMatch(/home-clara-textarea[^}]*field-sizing:\s*fixed[^}]*min-height:\s*68px[^}]*max-height:\s*120px/);
    expect(box).toContain("const conversationStarted = isConversationActive");
  });

  it("optimise une photo avant la validation finale et ne fabrique aucun succès stockage", () => {
    expect(queue.indexOf("prepareImageForUpload")).toBeLessThan(queue.indexOf("validateFile(payload)"));
    expect(upload).toContain('return { ok: false, error: "Cette photo n’a pas été envoyée. Réessayer." }');
    expect(upload).toMatch(/if \(!userId \|\| !accessToken\)[\s\S]*return \{ ok: true, file: guestFile\(\) \};/);
    expect(upload).toMatch(/if \(!uploaded\.ok\)[\s\S]*return \{ ok: false, error:/);
  });

  it("masque les noms techniques de photos et fournit un retour au dernier message accessible", () => {
    expect(box).toContain('alt="Photo ajoutée"');
    expect(box).toContain('title="Nouveau message"');
    expect(box).toContain('item.kind === "photo" ? "Photo ajoutée"');
  });
});