import { describe, it, expect } from "vitest";
import {
  toE164,
  normalizeEmail,
  normalizeName,
  priorityRank,
  cityFromRegion,
  specialtyBonus,
  normalizeOfficialRecord,
  rankCandidates,
  type OfficialSourceDoc,
} from "../../supabase/functions/_shared/officialSources";

const doc: OfficialSourceDoc = {
  source_key: "novoclimat_ventilation_autonome",
  source_name: "Test",
  source_url: "https://example.gouv.qc.ca/list.pdf",
  certification: "ventilation_autonome",
  document_sha256: "abc",
  document_updated_label: "10 juin 2026",
  records: [],
};

describe("official source normalization", () => {
  it("normalizes valid NANP phones and rejects invalid ones", () => {
    expect(toE164("(450) 434-1234")).toBe("+14504341234");
    expect(toE164("1 514 262 9791")).toBe("+15142629791");
    expect(toE164("0418872366")).toBeNull(); // invalid NPA
    expect(toE164("12345")).toBeNull();
  });

  it("never invents contact data", () => {
    expect(normalizeEmail("  INFO@Camec.CA ")).toBe("info@camec.ca");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(normalizeEmail(null)).toBeNull();
  });

  it("normalizes business names for dedupe", () => {
    expect(normalizeName("VENTILATION RS MANSEAU INC.")).toBe("ventilation rs manseau");
  });

  it("prioritizes Laval, then Laurentides, then Lanaudière", () => {
    expect(priorityRank("Laval")).toBe(1);
    expect(priorityRank("Laurentides")).toBe(2);
    expect(priorityRank("Lanaudière")).toBe(3);
    expect(priorityRank("Bas-Saint-Laurent")).toBe(99);
  });

  it("only states a city when the region is the municipality", () => {
    expect(cityFromRegion("Laval")).toBe("Laval");
    expect(cityFromRegion("Laurentides")).toBeNull();
  });

  it("gives a specialty bonus only for signals present in the source", () => {
    const plain = specialtyBonus({ business_name: "PLOMBERIE X" }, { source_kind: "novoclimat", certification: "ventilation_autonome" });
    const envelope = specialtyBonus({ business_name: "ISOLATION ET VENTILATION Y" }, { source_kind: "novoclimat", certification: "ventilation_autonome_et_centralisee" });
    expect(envelope.bonus).toBeGreaterThan(plain.bonus);
    expect(envelope.signals).toContain("enveloppe_isolation");
    expect(plain.signals).not.toContain("enveloppe_isolation");
  });

  it("flags records with no published contact instead of inferring one", () => {
    const n = normalizeOfficialRecord(doc, { certificate_no: "1", business_name: "SANS CONTACT", phone: null, email: null, region: "Laval" }, "2026-01-01T00:00:00Z");
    expect(n.parse_error).toBe("no_published_contact");
    expect(n.phone_e164).toBeNull();
    expect(n.provenance.provenance).toBe("official_verified_source");
  });

  it("ranks priority regions and stronger specialties first", () => {
    const mk = (name: string, region: string) =>
      normalizeOfficialRecord(doc, { certificate_no: name, business_name: name, phone: "4504341234", email: null, region }, "2026-01-01T00:00:00Z");
    const ranked = rankCandidates([mk("AAA", "Estrie"), mk("ISOLATION BBB", "Laval"), mk("CCC", "Laurentides")]);
    expect(ranked.map((r) => r.business_name)).toEqual(["ISOLATION BBB", "CCC", "AAA"]);
  });
});
