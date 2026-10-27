import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const edge = readFileSync("supabase/functions/activation-confirm/index.ts", "utf8");
const prospectPage = readFileSync("src/pages/PageProspectActivationSuccess.tsx", "utf8");
const contractorPage = readFileSync("src/pages/contractor/PageContractorActivated.tsx", "utf8");

describe("P0: Stripe return page must not activate a business", () => {
  it("quarantines the legacy Edge activation endpoint without any payment, DB or auth side effects", () => {
    expect(edge).toContain('status: "verification_pending"');
    expect(edge).toContain('code: "signed_webhook_entitlement_required"');
    expect(edge).toMatch(/}, 202\);/);
    expect(edge).toContain('paid: false');
    expect(edge).not.toMatch(/import\s+Stripe|new\s+Stripe\s*\(|createClient\s*\(|\.from\s*\(|\.update\s*\(|\.insert\s*\(|generateLink\s*\(/);
    expect(edge).not.toMatch(/\.checkout\.sessions\.retrieve|activated:\s*true|magic_link\s*:/);
    expect(edge).not.toMatch(/req\.json\s*\(|req\.headers\.get\s*\(\s*["']origin["']/);
  });

  it("keeps the legacy prospect success URL passive even if the hosted Edge function is stale", () => {
    expect(prospectPage).not.toMatch(/functions\.invoke|supabase\.from\(|fetch\s*\(|useEffect\s*\(/);
    expect(prospectPage).not.toMatch(/Visibilité IA activée|magic_link|lien d'accès a été envoyé|renouvellement automatique/);
    expect(prospectPage).toContain("webhook Stripe signé");
    expect(prospectPage).toContain("ne recommencez pas le paiement");
  });

  it("keeps the contractor checkout return passive; no polling or false entitlement", () => {
    expect(contractorPage).not.toMatch(/functions\.invoke|supabase\.from\(|fetch\s*\(|setTimeout\s*\(|useEffect\s*\(/);
    expect(contractorPage).not.toMatch(/Profil Fondateur activé|Votre profil est en ligne/);
    expect(contractorPage).toContain("webhook signé");
    expect(contractorPage).toContain("ne payez pas de nouveau");
  });
});
