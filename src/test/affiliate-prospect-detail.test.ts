import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { smsBlockReason, lineTypeLabel, licenceLabel, sourceLabel } from "@/features/affiliate/warRoom/ProspectDetailSheet";

describe("Fiche prospect affilié", () => {
  it("ligne fixe : SMS interdit", () => {
    expect(smsBlockReason({ phone_e164: "+15142577337", phone_line_type: "landline", sms_eligible: false })).toMatch(/SMS interdit/);
    expect(lineTypeLabel("landline")).toBe("Ligne fixe — SMS interdit");
  });
  it("type inconnu : SMS bloqué (échec fermé)", () => {
    expect(smsBlockReason({ phone_e164: "+15146961339", phone_line_type: null, sms_eligible: null })).toMatch(/bloqué/);
  });
  it("RBQ déclaré n'est jamais présenté comme vérifié", () => {
    expect(licenceLabel({ rbq_number: "1783370273", rbq_source_url: null })).toMatch(/déclarée, à vérifier/);
    expect(licenceLabel({ rbq_number: null, rbq_source_url: null })).toMatch(/à vérifier/);
  });
  it("provenance Google Places", () => expect(sourceLabel("google_places")).toBe("Google Places"));
  it("la RPC vérifie l'assignation et refuse anon", () => {
    const sql = readFileSync(
      require("node:child_process").execSync("rg -l manual_prospect_detail_for_me supabase/migrations drizzle 2>/dev/null || true").toString().trim().split("\n")[0], "utf8");
    expect(sql).toMatch(/is_affiliate_owner\(a\.affiliate_id\)/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.manual_prospect_detail_for_me\(uuid\) FROM PUBLIC, anon/);
  });
});
