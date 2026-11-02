import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const page = readFileSync("src/pages/scan-ia/PageScanIAActivationSuccess.tsx", "utf8");
const legacyEdge = readFileSync("supabase/functions/scan-ia-activation-confirm/index.ts", "utf8");

describe("P0: Scan IA Stripe return must fail closed", () => {
  it("remains passive even when a legacy Edge function is still deployed", () => {
    expect(page).not.toContain("functions.invoke");
    expect(page).not.toContain("supabase.from(");
    expect(page).not.toContain("fetch(");
    expect(page).not.toContain("useEffect(");
    expect(page).not.toContain("setTimeout(");
    expect(page).not.toContain("Activation confirmée");
    expect(page).not.toContain("Votre profil IA est en cours d'activation");
    expect(page).not.toContain("CheckCircle2");
    expect(page).toContain("webhook Stripe signé");
    expect(page).toContain("ne payez pas de nouveau");
  });

  it("does not grant success for missing references or pass an untrusted token to signup", () => {
    expect(page).toContain('params.get("cs") && params.get("st")');
    expect(page).toContain("Lien de retour incomplet");
    expect(page).not.toContain("/signup?scan=");
    expect(page).not.toContain("encodeURIComponent");
    expect(page).not.toContain("activated_at");
    expect(page).not.toContain("stripe_session_id");
  });
  it("disables the legacy Edge write path regardless of untrusted Stripe return parameters", () => {
    expect(legacyEdge).toContain("signed_activation_verification_required");
    expect(legacyEdge).toContain("activated: false");
    expect(legacyEdge).toContain("paid: false");
    expect(legacyEdge).toMatch(/return json\([\s\S]*410,/);
    expect(legacyEdge).not.toContain("sessions.retrieve(");
    expect(legacyEdge).not.toContain("createClient(");
    expect(legacyEdge).not.toContain(".update(");
    expect(legacyEdge).not.toContain("Deno.env.get(");
    expect(legacyEdge).not.toContain("activated_at:");
    expect(legacyEdge).not.toContain("paid: true");
  });
});
