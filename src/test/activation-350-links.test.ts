import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { buildActivation350Links, normalizeRef } from "@/lib/activation350Links";

describe("Page activation 350 $ — liens", () => {
  it("conserve le code ref vers l'activation et l'audit", () => {
    const l = buildActivation350Links(new URLSearchParams("ref=lorraine-unpro&utm_source=sms"));
    expect(l.activate).toContain("ref=LORRAINE-UNPRO");
    expect(l.activate).toContain("from=activation_350");
    expect(l.activate.startsWith("/entrepreneur/devis-personnalise?")).toBe(true);
    expect(l.audit).toBe("/entrepreneurs/audit-ia?utm_source=sms&ref=LORRAINE-UNPRO");
  });
  it("option rendez-vous : parcours personnalisé existant, ref et utm conservés", () => {
    const l = buildActivation350Links(new URLSearchParams("ref=LORRAINE-UNPRO&utm_source=sms"));
    expect(l.more.startsWith("/entrepreneur/devis-personnalise?")).toBe(true);
    expect(l.more).toContain("ref=LORRAINE-UNPRO");
    expect(l.more).toContain("utm_source=sms");
    expect(l.more).toContain("view=personalized");
  });
  it("rejette un ref malformé", () => {
    expect(normalizeRef("<script>")).toBeNull();
    expect(buildActivation350Links(new URLSearchParams("")).audit).toBe("/entrepreneurs/audit-ia");
  });
});

describe("Page activation 350 $ — textes", () => {
  const src = readFileSync("src/pages/entrepreneur/PageActivation350.tsx", "utf8");
  it("taxes exactes et rendez-vous exclus avant paiement", () => {
    expect(src).toContain("350 $ + TPS/TVQ, soit 402,41 $ au Québec · Sans abonnement ni renouvellement automatique");
    expect(src).toContain("les rendez-vous se choisissent séparément et ne sont pas compris dans cette activation");
  });
  it("retire l'ancien eyebrow, le titre Clara et la carte de non-garanties", () => {
    expect(src).not.toMatch(/Paiement unique/);
    expect(src).not.toContain("posent la question à Clara");
    expect(src).not.toContain("Ce que l'activation ne garantit pas");
    expect(src).not.toContain("2 minutes");
    expect(src).not.toMatch(/\bAlex\b/);
  });
  it("aucune garantie de classement ChatGPT", () => {
    expect(src).not.toMatch(/garanti(e|t)? (votre|un|le) (classement|rang)|premier sur ChatGPT|partenaire (de|d')? ?OpenAI/i);
    expect(src).toContain("ne garantit ni classement");
  });
  it("vidéo réelle : pointeur CDN existant", () => {
    expect(src).toContain("AuditVideoBlock");
    expect(existsSync("src/assets/unpro-audit-ia-final-16x9.mp4.asset.json")).toBe(true);
  });
});
