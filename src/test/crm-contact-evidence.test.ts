import { describe, expect, it } from "vitest";
import {
  CONTACT_EVIDENCE_FILTERS,
  contactEvidence,
  matchesContactEvidence,
} from "@/lib/crm/contactEvidence";

describe("manual CRM contact evidence (read-only)", () => {
  it("does not present missing traces as proof the firm was never contacted", () => {
    const evidence = contactEvidence({});
    expect(evidence.map((item) => item.key)).toEqual(["no_trace"]);
    expect(evidence[0].label).toMatch(/Aucun envoi tracé/);
  });

  it("keeps attempts, delivery aggregates, clicks, and email sends distinct", () => {
    const row = {
      sms_sent: 3,
      sms_delivered: 2,
      sms_undelivered: 1,
      emails_sent: 4,
      clicked_at: "2026-08-13T09:17:27.239Z",
    };
    const evidence = contactEvidence(row);
    expect(evidence.map((item) => item.key)).toEqual([
      "delivered_crm", "undelivered", "email_sent", "attempted", "clicked",
    ]);
    expect(evidence.some((item) => /paiement confirmé|client intéressé|réponse reçue/i.test(item.label))).toBe(false);
    expect(matchesContactEvidence(row, "clicked")).toBe(true);
    expect(matchesContactEvidence(row, "outcome_logged")).toBe(false);
    expect(matchesContactEvidence(row, "no_trace")).toBe(false);
  });

  it("never treats a recorded manual outcome as proof of an inbound reply", () => {
    const evidence = contactEvidence({ last_outcome: "follow_up" });
    expect(evidence.map((item) => item.key)).toEqual(["outcome_logged"]);
    expect(evidence[0].detail).toMatch(/ne prouve pas nécessairement une réponse entrante/);
  });

  it("gives suppression precedence over every positive event", () => {
    const row = { opted_out: true, sms_delivered: 2, emails_sent: 3, clicked_at: "2026-08-13" };
    expect(contactEvidence(row).map((item) => item.key)).toEqual(["opted_out"]);
    expect(matchesContactEvidence(row, "clicked")).toBe(false);
    expect(matchesContactEvidence(row, "opted_out")).toBe(true);
  });

  it("provides unique filter keys and no inferred paying stage", () => {
    const keys = CONTACT_EVIDENCE_FILTERS.map((item) => item.value);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).not.toContain("paid");
    expect(keys).not.toContain("interested");
  });
});
