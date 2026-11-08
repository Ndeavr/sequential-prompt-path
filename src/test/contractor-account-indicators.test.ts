import { describe, expect, it } from "vitest";
import { rbqIndicator, registeredLabel } from "@/lib/contractor/accountIndicators";

const today = new Date("2026-11-08T12:00:00Z");
describe("indicateurs distincts profil / RBQ / calendrier", () => {
  it("RBQ déclarée ≠ vérifiée", () => expect(rbqIndicator({ rbq_number: "5678-1234-01" }, today)).toBe("declared_pending"));
  it("vérifiée seulement avec statut + date de vérification", () => {
    expect(rbqIndicator({ rbq_compliance_status: "verified", rbq_verified_at: "2026-10-01T00:00:00Z" }, today)).toBe("verified");
    expect(rbqIndicator({ rbq_compliance_status: "verified" }, today)).toBe("not_provided");
  });
  it("licence vérifiée mais échue = expirée", () =>
    expect(rbqIndicator({ rbq_compliance_status: "verified", rbq_verified_at: "2025-01-01T00:00:00Z", rbq_expiry_date: "2026-11-01" }, today)).toBe("expired"));
  it("date d'inscription inconnue : rien d'affiché", () => {
    expect(registeredLabel(null)).toBeNull();
    expect(registeredLabel("2026-11-08T15:00:00Z")).toBe("Inscrit à UNPRO le 8 novembre 2026");
  });
});
