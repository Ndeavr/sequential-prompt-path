import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
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
    // Every migration that (re)defines the RPC must keep both guards; no external tool needed.
    const defining = ["supabase/migrations", "drizzle/migrations"].filter(existsSync)
      .flatMap((dir) => readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => join(dir, f)))
      .map((file) => readFileSync(file, "utf8"))
      .filter((sql) => /CREATE OR REPLACE FUNCTION public\.manual_prospect_detail_for_me\(/.test(sql));
    expect(defining.length).toBeGreaterThan(0);
    for (const sql of defining) {
      expect(sql).toMatch(/is_affiliate_owner\(a\.affiliate_id\)/);
      expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.manual_prospect_detail_for_me\(uuid\) FROM PUBLIC, anon/);
    }
  });
});
