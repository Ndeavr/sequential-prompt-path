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
  it("partage une activation locale entre Clara et le hero sans redimensionner le header", () => {
    expect(box).toContain("clara:conversation-active");
    expect(box).toContain("clara_conversation_activated");
    expect(hero).toContain("onConversationActiveChange={setIsConversationActive}");
    expect(header).not.toContain("homeConversationActive");
  });

  it("laisse 100dvh absorber le clavier sans gestionnaire de repositionnement", () => {
    expect(box).not.toContain("window.visualViewport");
    expect(box).not.toContain('addEventListener("resize", updateViewport)');
    expect(box).not.toContain('addEventListener("scroll", updateViewport)');
    expect(css).toContain("100dvh");
  });

  it("cible le seul élément réellement défilable rendu par la conversation", () => {
    expect(box).toContain('querySelector<HTMLElement>(".home-clara-conversation > div")');
    expect(css).toMatch(/\.home-light \.home-clara-conversation > div \{[\s\S]*?overflow-y: auto/);
  });

  it("garde le composer compact et extensible jusqu’à cinq lignes environ", () => {
    expect(box).toContain('rows={1}');
    expect(box).toContain("Math.min(field.scrollHeight, 120)");
    expect(css).toMatch(/home-clara-textarea[^}]*field-sizing:\s*content[^}]*min-height:\s*48px[^}]*max-height:\s*120px/);
    expect(box).toContain("const conversationStarted = isConversationActive");
  });

  it("sépare les actions du textarea et mesure réellement le composer", () => {
    expect(css).toMatch(/\.home-light \.home-clara-controls\s*\{[^}]*position:\s*static/);
    expect(css).not.toMatch(/\.home-light \.home-clara-controls\s*\{[^}]*position:\s*absolute/);
    expect(box).toContain("const composerRef = useRef<HTMLDivElement>(null)");
    expect(box).toContain("new ResizeObserver(publishHeight)");
    expect(box).toContain('"--clara-composer-height"');
  });

  it("masque les suggestions au focus et pendant la saisie", () => {
    expect(box).toContain("const showIntentSuggestions = !isConversationActive");
    expect(box).toContain("&& !composerFocused");
    expect(box).toContain("&& composerText.trim().length === 0");
    expect(box).toContain("{showIntentSuggestions && (");
  });

  it("garde le champ vide et sépare strictement sa valeur du placeholder", () => {
    expect(box).toContain('placeholder: "Que voulez-vous faire ?"');
    expect(box).toContain('const [composerText, setComposerText] = useState("")');
    expect(box).toContain("value={composerText}");
    expect(box).toContain("setComposerText(\"\")");
    expect(box).not.toContain('placeholder: "Bonjour ! Que puis-je-faire pour vous?"');
  });

  it("désactive l’envoi sans texte ni pièce jointe", () => {
    expect(box).toContain("const canSubmit = hasText || attachments.files.length > 0");
    expect(box).toContain("disabled={busy || !canSubmit}");
    expect(box).toContain("if (!message.text.trim() && message.files.length === 0) return");
  });

  it("remplace les phrases arbitraires par des intentions réelles", () => {
    expect(box).toContain('label: "Je suis entrepreneur", intent: "contractor_onboarding"');
    expect(box).toContain('label: "Analyser 3 soumissions", intent: "quote_comparison"');
    expect(box).toContain('label: "Vérifier un entrepreneur", intent: "contractor_verification"');
    expect(box).toContain("chooseIntentSuggestion(suggestion)");
    expect(box).not.toContain("J’ai de l’eau ici.");
    expect(box).not.toContain("J’ai trois soumissions.");
  });

  it("donne à Clara la majorité de l’écran et résiste au clavier", () => {
    expect(css).toMatch(/home-clara-main\s*\{[\s\S]*height:\s*clamp\(420px,\s*60dvh,\s*620px\)/);
    expect(css).toContain('html[data-clara-conversation-active="true"] body');
    expect(css).toMatch(/\.home-light \.home-clara-shell\.is-conversation-active \.home-clara-main \{[\s\S]*?height: 100%;[\s\S]*?min-height: 0;/);
    expect(css).not.toContain("data-keyboard-open");
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
    expect(box).toContain('aria-label="Réessayer ce fichier"');
    expect(box).toContain('aria-label="Retirer ce fichier"');
  });

  it("nettoie les aperçus locaux et poursuit une analyse de soumissions dans le même fil", () => {
    expect(box).toContain("localPreviewUrls.current.forEach((url) => URL.revokeObjectURL(url))");
    expect(box).toContain("await appendClaraMessage({");
    expect(box).toContain("analysisContinuation");
    expect(box).toContain('role: "assistant"');
  });
});