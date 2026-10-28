// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/entrepreneur/PageAppointmentSetterExplainer.tsx", "utf8");
const router = readFileSync("src/app/router.tsx", "utf8");
const landing = readFileSync("src/pages/entrepreneur/PageEntrepreneursLanding.tsx", "utf8");

describe("UNPRO animated appointment explainer", () => {
  it("uses Clara and exactly six illustrated stages", () => {
    expect(page).toContain("const numberOfSteps = 6");
    for (const line of [
      "L'agenda", "Le déplacement", "Trois choix", "Le choix", "L'événement", "L'alerte",
    ]) expect(page).toContain(line);
    expect(page).toContain("Clara");
  });
  it("offers exactly three clickable simulated slots, never real bookings", () => {
    expect(page).toContain("const SLOT_LABELS = [");
    expect(page).toContain('tagFr: "Plus tôt"');
    expect(page).toContain('tagFr: "Itinéraire optimisé*"');
    expect(page).toContain('tagFr: "Autre choix"');
    expect(page).toContain("SLOT_LABELS.map");
    expect(page).toContain("choose(index)");
    expect(page).toContain("aucun véritable rendez-vous créé");
    expect(page).not.toMatch(/(?:supabase\.(?:from|rpc|functions\.invoke)\s*\(|\b(?:fetch|sendSms|pushGoogleEvent)\s*\()/);
  });
  it("shows distance, duration and buffer as explicitly fictional until routing is verified", () => {
    expect(page).toContain("18 km");
    expect(page).toContain("28 min");
    expect(page).toContain("+15 min");
    expect(page).toContain("Un vrai trajet exige des données de routage vérifiées.");
  });
  it("does not claim phone notifications are delivered", () => {
    expect(page).toContain("nécessite des notifications push ou SMS transactionnels configurés et vérifiés");
    expect(page).toContain("Illustration d'une fonctionnalité cible");
    expect(page).toContain("L'ajout réel nécessite un calendrier connecté");
  });
  it("uses reduced-motion and keyboard controls, mobile layout and known logo", () => {
    expect(page).toContain("useReducedMotion");
    expect(page).toContain("aria-pressed={playing}");
    expect(page).toContain("aria-live=\"polite\"");
    expect(page).toContain("min-h-11");
    expect(page).toContain("lg:grid-cols");
    expect(page).toContain("<UnproLogo");
    expect(page).toContain('useLanguage()');
  });
  it("mounts before the dynamic entrepreneur slug route and links from the current landing", () => {
    const explainer = router.indexOf('path="/entrepreneurs/rendez-vous-intelligents"');
    const generic = router.indexOf('path="/entrepreneurs/:slug"');
    expect(explainer).toBeGreaterThan(0);
    expect(generic).toBeGreaterThan(explainer);
    expect(landing).toContain('campaignLink("/entrepreneurs/rendez-vous-intelligents", search)');
    expect(page).toContain('campaignLink("/entrepreneurs/audit-ia", search)');
  });
});
