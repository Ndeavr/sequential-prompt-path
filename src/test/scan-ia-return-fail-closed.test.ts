import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/scan-ia/PageScanIAActivationSuccess.tsx", "utf8");

describe("P0: Scan IA Stripe return must fail closed", () => {
  it("remains passive even when a legacy Edge function is still deployed", () => {
    expect(page).not.toMatch(/functions\\.invoke|supabase\\.from\\(|fetch\\s*\\(|useEffect\\s*\\(|setTimeout\\s*\\(/);
    expect(page).not.toMatch(/Activation confirmée|Votre profil IA est en cours d'activation|CheckCircle2/);
    expect(page).toContain("webhook Stripe signé");
    expect(page).toContain("ne payez pas de nouveau");
  });

  it("does not grant success for missing references or pass an untrusted token to signup", () => {
    expect(page).toContain('params.get("cs") && params.get("st")');
    expect(page).toContain("Lien de retour incomplet");
    expect(page).not.toMatch(/\\/signup\\?scan=|encodeURIComponent|activated_at|stripe_session_id/);
  });
});
