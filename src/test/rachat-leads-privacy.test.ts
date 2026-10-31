import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/pages/marketing/PageRachatLeads.tsx", "utf8");
const sql = readFileSync("supabase/migrations/20261031154000_lead_repurchase_intake.sql", "utf8");
const router = readFileSync("src/app/router.tsx", "utf8");
const login = readFileSync("src/pages/Login.tsx", "utf8");

describe("Rachat de leads — confidentialité et conversion", () => {
  it("expose un seul parcours SEO relié au vrai formulaire", () => {
    expect(router).toContain('path="/rachat-leads-entrepreneurs"');
    expect(page).toContain('canonical={CANONICAL}');
    expect(page).toContain("UNPRO rachète vos leads!");
    expect(page).toContain('type="file"');
  });
  it("dirige les nouveaux entrepreneurs vers le vrai code SMS et conserve le retour", () => {
    expect(page).toContain('contractorLoginPath("/rachat-leads-entrepreneurs") + "?method=phone"');
    expect(page).toContain("saveAuthIntent");
    expect(login).toContain('get("method") === "phone"');
    expect(page).toContain('role === "contractor"');
  });
  it("ne reçoit les coordonnées que si le professionnel atteste leur transmission autorisée", () => {
    expect(page).toContain("if (!consent || !termsAccepted)");
    expect(page).toContain("if (!draft.consent_provenance.trim()");
    expect(sql).toContain("CHECK (consent_attested = true)");
    expect(sql).toContain("consent_provenance text NOT NULL");
  });
  it("sépare les demandes en attente des crédits réellement validés", () => {
    expect(sql).toContain("status text NOT NULL DEFAULT 'pending'");
    expect(sql).toContain("approved_credit_cents integer NOT NULL DEFAULT 0");
    expect(sql).toContain("AND approved_credit_cents = 0");
    expect(page).toContain('item.status === "approved" && item.approved_credit_cents > 0');
  });
  it("ne publie pas les pièces et exige la propriété du dossier en RLS", () => {
    expect(sql).toContain("'lead-repurchase-private',false");
    expect(sql).toContain("repurchase_files_owner_upload");
    expect(sql).toContain("s.owner_user_id = (select auth.uid())");
    expect(sql).toContain("repurchase_documents_owner_read_or_admin");
    expect(page).toContain("crypto.randomUUID()");
  });
  it("conserve le consentement commercial indépendant et désactivé par défaut", () => {
    expect(sql).toContain("sms_opt_in boolean NOT NULL DEFAULT false");
    expect(sql).toContain("email_opt_in boolean NOT NULL DEFAULT false");
    expect(page).toContain("sms_opt_in: false, email_opt_in: false");
    expect(page).toContain('onChange={e=>setPrefs(p=>({...p,sms_opt_in:e.target.checked}))}');
  });
});
