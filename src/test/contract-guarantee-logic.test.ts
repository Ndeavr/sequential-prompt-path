import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  GUARANTEE_OFFER, GUARANTEE_OFFER_CODE, guaranteeRefundBaseCents, guaranteeRecordArgs, isCountedContract,
  type GuaranteeRecordCandidate,
} from "../../supabase/functions/_shared/contractGuarantee";

const WINDOW = { paidAt: "2026-11-10T00:00:00Z", endsAt: "2027-11-10T00:00:00Z" };
const NOW = Date.parse("2027-01-01T00:00:00Z");
const base: GuaranteeRecordCandidate = {
  kind: "contract", contractorAcceptedAt: "2026-12-01T00:00:00Z", clientAcceptedAt: "2026-12-02T00:00:00Z",
  clientAcceptanceEvidence: "Contrat signé par le client", scopeMatches: true,
};

describe("garantie 10 contrats — règles pures", () => {
  it("0/4/10/12 contrats → 350/210/0/0 $ de base", () => {
    expect([0, 4, 10, 12].map((n) => guaranteeRefundBaseCents(n))).toEqual([35000, 21000, 0, 0]);
  });

  it("seul un contrat accepté et prouvé des deux côtés compte", () => {
    expect(isCountedContract(base, WINDOW)).toBe(true);
    expect(isCountedContract({ ...base, clientAcceptedAt: null }, WINDOW)).toBe(false); // unilatéral
    expect(isCountedContract({ ...base, clientAcceptanceEvidence: null }, WINDOW)).toBe(false); // non signé / sans preuve
    expect(isCountedContract({ ...base, kind: "appointment" }, WINDOW)).toBe(false);
    expect(isCountedContract({ ...base, kind: "quote_request" }, WINDOW)).toBe(false);
    expect(isCountedContract({ ...base, kind: "quote_sent" }, WINDOW)).toBe(false);
    expect(isCountedContract({ ...base, scopeMatches: false }, WINDOW)).toBe(false);
    expect(isCountedContract({ ...base, clientAcceptedAt: "2027-12-01T00:00:00Z" }, WINDOW)).toBe(false);
  });

  it("le webhook n'enregistre que l'offre exacte au prix complet", () => {
    const session = {
      id: "cs_test_1", payment_status: "paid", amount_subtotal: 35000, amount_total: 40241, currency: "cad",
      payment_intent: "pi_1", total_details: { amount_discount: 0, amount_tax: 5241 },
      metadata: { offer: "entry_activation_350", offer_version: GUARANTEE_OFFER_CODE },
    };
    const args = guaranteeRecordArgs(session, { id: "evt_1", livemode: false, created: 1794312000 }, "c1");
    expect(args).toMatchObject({ p_stripe_mode: "test", p_session_id: "cs_test_1", p_subtotal_cents: 35000, p_tax_cents: 5241 });
    expect(guaranteeRecordArgs({ ...session, metadata: { offer: "entry_activation_350" } }, { id: "e" }, "c1")).toBeNull();
    expect(guaranteeRecordArgs({ ...session, payment_status: "unpaid" }, { id: "e" }, "c1")).toBeNull();
    expect(guaranteeRecordArgs({ ...session, total_details: { amount_discount: 34900 } }, { id: "e" }, "c1")).toBeNull();
    expect(guaranteeRecordArgs({ ...session, metadata: { ...session.metadata, promo_code_id: "promo_1" } }, { id: "e" }, "c1")).toBeNull();
    expect(guaranteeRecordArgs({ ...session, amount_subtotal: 100 }, { id: "e" }, "c1")).toBeNull();
  });

  it("les constantes reflètent la version immuable en base", () => {
    const file = readdirSync("drizzle/migrations").find((f) => f.endsWith("_contract_guarantee_offer.sql"))!;
    const sql = readFileSync(`drizzle/migrations/${file}`, "utf8");
    const row = `('${GUARANTEE_OFFER.code}', '350 $ : 10 contrats garantis', ${GUARANTEE_OFFER.baseAmountCents}, ${GUARANTEE_OFFER.termMonths}, ${GUARANTEE_OFFER.guaranteedContracts}, ${GUARANTEE_OFFER.refundPerMissingCents}, ${GUARANTEE_OFFER.refundCapCents}, false,`;
    expect(sql).toContain(row);
  });
});
