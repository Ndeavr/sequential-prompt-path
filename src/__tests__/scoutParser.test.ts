import { describe, it, expect } from "vitest";
import {
  parseScoutText,
  toE164,
  hasContactPoint,
  normalizeDomain,
} from "../../supabase/functions/_shared/scoutParser";

describe("scoutParser — phone normalization", () => {
  it("normalizes every common Quebec format to E.164", () => {
    for (const raw of ["(514) 555-1234", "514-555-1234", "514.555.1234", "5145551234", "+1 514 555 1234"]) {
      expect(toE164(raw)).toBe("+15145551234");
    }
  });

  it("rejects invalid NANP numbers instead of inventing one", () => {
    expect(toE164("123-4567")).toBeNull();
    expect(toE164("0145551234")).toBeNull();
    expect(toE164(null)).toBeNull();
  });
});

describe("scoutParser — signal extraction", () => {
  const post = `Toitures Lavallée Inc.
Nous sommes disponible pour partenariat en sous-traitance sur la Rive-Nord.
Toiture résidentielle, Laval et environs.
RBQ 5678-1234-01
Tél: (450) 662-7788 — info@toitureslavallee.ca
www.toitureslavallee.ca`;

  const parsed = parseScoutText(post, "Marc Lavallée");

  it("extracts company, contact, phone, email, site, RBQ", () => {
    expect(parsed.company_name).toBe("Toitures Lavallée Inc.");
    expect(parsed.contact_name).toBe("Marc Lavallée");
    expect(parsed.phone_e164).toBe("+14506627788");
    expect(parsed.email).toBe("info@toitureslavallee.ca");
    expect(parsed.website_url).toBe("https://toitureslavallee.ca");
    expect(parsed.rbq_number).toBe("5678-1234-01");
  });

  it("detects trade and city", () => {
    expect(parsed.category).toBe("toiture");
    expect(parsed.city).toBe("Laval");
  });

  it("scores high intent with evidence", () => {
    expect(parsed.intent_score).toBeGreaterThanOrEqual(40);
    expect(parsed.intent_evidence).toContain("disponible pour partenariat");
  });

  it("reports usable confidence", () => {
    expect(parsed.confidence).toBeGreaterThan(0.7);
    expect(hasContactPoint(parsed)).toBe(true);
  });
});

describe("scoutParser — low signal posts", () => {
  it("returns nulls rather than guesses for chit-chat", () => {
    const p = parseScoutText("Bonjour tout le monde, belle journée aujourd'hui !", "Julie T.");
    expect(p.phone_e164).toBeNull();
    expect(p.email).toBeNull();
    expect(p.company_name).toBeNull();
    expect(p.intent_score).toBe(0);
    expect(hasContactPoint(p)).toBe(false);
  });

  it("ignores facebook/instagram links as websites", () => {
    const p = parseScoutText("Voir ma page facebook.com/monentreprise et instagram.com/moi");
    expect(p.website_url).toBeNull();
  });

  it("scores a homeowner request as low intent even with a phone", () => {
    const p = parseScoutText("Je cherche un plombier à Laval, urgent. 514-555-9090");
    expect(p.category).toBe("plomberie");
    expect(p.intent_score).toBeLessThan(40);
    expect(hasContactPoint(p)).toBe(true);
  });
});

describe("scoutParser — domain normalization for dedupe", () => {
  it("collapses protocol, www and paths", () => {
    expect(normalizeDomain("https://www.Plomberie-XYZ.ca/contact?a=1")).toBe("plomberie-xyz.ca");
  });
});
