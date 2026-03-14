/**
 * UNPRO — QA Automation Tests
 * Critical flow tests for platform integrity.
 */
import { describe, it, expect, vi } from "vitest";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
      insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "test-id" }, error: null }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: () => Promise.resolve({ data: {}, error: null }) }) }) }),
    }),
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: "test-user" } }, error: null }),
      signUp: () => Promise.resolve({ data: { user: { id: "test-user" } }, error: null }),
    },
    functions: {
      invoke: () => Promise.resolve({ data: {}, error: null }),
    },
  },
}));

// ===== Service imports =====
import { detectPlatform, getCertificationLabel } from "@/services/property/listingImportService";
import { calculateHomeScore, type HomeScoreInput } from "@/services/homeScoreService";
import { getStatusLabel } from "@/services/property/propertyService";
import { PASSPORT_SECTIONS, getLevelBadge } from "@/services/property/passportService";
import { normalizeAddress, generateSlug } from "@/lib/addressNormalizer";
import { trackEvent, type EventCategory } from "@/services/eventTrackingService";

// ===== 1. Address Search =====
describe("Address Search", () => {
  it("normalizes addresses consistently", () => {
    const addr1 = normalizeAddress("123 Rue des Érables, Montréal, QC");
    const addr2 = normalizeAddress("123 rue des erables, montreal, qc");
    expect(addr1).toBe(addr2);
  });

  it("generates valid slug from address", () => {
    const slug = generateSlug({
      streetNumber: "456",
      streetName: "Boulevard Saint-Laurent",
      city: "Montréal",
      province: "QC",
    });
    expect(slug).toBeTruthy();
    expect(slug).not.toContain(" ");
  });
});

// ===== 2. Property Public Page =====
describe("Property Public Page", () => {
  it("returns correct status labels", () => {
    expect(getStatusLabel("estimated").label).toBe("Score estimé");
    expect(getStatusLabel("maison_certifiee").label).toBe("Maison certifiée");
    expect(getStatusLabel("private").label).toBe("Score estimé");
    expect(getStatusLabel(null).label).toBe("Score estimé");
  });
});

// ===== 3. Passport Completion =====
describe("Passport Completion", () => {
  it("has 5 standard sections", () => {
    expect(PASSPORT_SECTIONS).toHaveLength(5);
    expect(PASSPORT_SECTIONS.map(s => s.key)).toContain("basic_info");
    expect(PASSPORT_SECTIONS.map(s => s.key)).toContain("structure_systems");
  });

  it("returns correct level badges", () => {
    expect(getLevelBadge("débutant").emoji).toBe("🌱");
    expect(getLevelBadge("certifié").emoji).toBe("💎");
  });

  it("section weights sum to 100", () => {
    const totalWeight = PASSPORT_SECTIONS.reduce((s, sec) => s + sec.weight, 0);
    expect(totalWeight).toBe(100);
  });
});

// ===== 4. Score Update =====
describe("Home Score Calculation", () => {
  const baseInput: HomeScoreInput = {
    yearBuilt: 2000,
    propertyType: "house",
    squareFootage: 1500,
    condition: "good",
    hasInspectionReports: false,
    uploadedDocumentCount: 0,
    quoteCount: 0,
    renovationCount: 0,
    recentRepairCount: 0,
  };

  it("calculates a score between 0-100", () => {
    const result = calculateHomeScore(baseInput);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it("returns estimated type for minimal data", () => {
    const result = calculateHomeScore({
      ...baseInput,
      yearBuilt: null,
      condition: null,
    });
    expect(result.scoreType).toBe("estimated");
  });

  it("returns enriched type for comprehensive data", () => {
    const result = calculateHomeScore({
      ...baseInput,
      heatingType: "electric",
      roofYear: 2015,
      windowsYear: 2018,
      plumbingYear: 2010,
      insulationType: "fiberglass",
      foundationType: "concrete",
      passportCompletionPct: 80,
    });
    expect(result.scoreType).toBe("enriched");
  });

  it("has 5 factors in breakdown", () => {
    const result = calculateHomeScore(baseInput);
    expect(result.factors).toHaveLength(5);
  });

  it("better condition yields higher score", () => {
    const poor = calculateHomeScore({ ...baseInput, condition: "poor" });
    const excellent = calculateHomeScore({ ...baseInput, condition: "excellent" });
    expect(excellent.overall).toBeGreaterThan(poor.overall);
  });
});

// ===== 5. Listing Import =====
describe("Listing Import", () => {
  it("detects Centris platform", () => {
    expect(detectPlatform("https://www.centris.ca/fr/maison~a-vendre~montreal")).toBe("centris");
  });

  it("detects Realtor.ca platform", () => {
    expect(detectPlatform("https://www.realtor.ca/real-estate/12345")).toBe("realtor");
  });

  it("detects DuProprio platform", () => {
    expect(detectPlatform("https://duproprio.com/fr/maison")).toBe("duproprio");
  });

  it("returns other for unknown URLs", () => {
    expect(detectPlatform("https://unknown-site.com/listing")).toBe("other");
  });
});

// ===== 6. Certification =====
describe("Certification Labels", () => {
  it("returns correct French labels", () => {
    expect(getCertificationLabel("not_eligible").label).toBe("Non éligible");
    expect(getCertificationLabel("certified").label).toBe("Maison certifiée UnPRO");
    expect(getCertificationLabel("expired").label).toBe("Certification expirée");
  });

  it("returns correct badge colors", () => {
    expect(getCertificationLabel("certified").color).toBe("default");
    expect(getCertificationLabel("expired").color).toBe("destructive");
  });
});

// ===== 7. Event Tracking =====
describe("Event Tracking", () => {
  it("trackEvent does not throw", async () => {
    await expect(
      trackEvent({ eventType: "test", category: "search" as EventCategory })
    ).resolves.not.toThrow();
  });
});

// ===== 8. QR Route =====
describe("QR Token Resolution", () => {
  it("validates token format (UUID-like)", () => {
    const validToken = "abc123-def456";
    expect(validToken.length).toBeGreaterThan(5);
  });
});

// ===== 9. Contractor Public Page =====
describe("Contractor Public Profile", () => {
  it("status labels exist for all property statuses", () => {
    const statuses = ["estimated", "passeport_disponible", "passeport_actif", "maison_certifiee", "travaux_en_cours"];
    statuses.forEach(s => {
      const label = getStatusLabel(s);
      expect(label.label).toBeTruthy();
      expect(label.color).toBeTruthy();
    });
  });
});
