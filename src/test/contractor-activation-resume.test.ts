import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ user: { id: "owner" } as { id: string } | null, rows: [] as { id: string; company_name: string; pricing_status: string }[], error: null as Error | null, eq: vi.fn(), token: null as string | null, guest: null as unknown }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getUser: async () => ({ data: { user: m.user }, error: null }) }, from: () => ({ select: () => ({ eq: (...args: unknown[]) => { m.eq(...args); return { order: async () => ({ data: m.rows, error: m.error }) }; } }) }) } }));
vi.mock("@/services/contractorPricingQuoteService", () => ({ fetchPricingQuote: async () => m.guest }));
vi.mock("@/services/clara/claraSession", () => ({ peekClaraSessionToken: () => m.token, startOrResumeClaraSession: async () => ({ context: { pricing_quote_id: "guest-quote" } }) }));
import { activationQuoteDestination, resumeContractorActivation } from "@/services/contractorActivationResume";
beforeEach(() => { m.user = { id: "owner" }; m.rows = []; m.error = null; m.token = null; m.guest = null; m.eq.mockClear(); });
const quote = { id: "quote-1", company_name: "Isolation Solution Royal", pricing_status: "offered" };
describe("activation resume", () => {
  it("returns the existing plan and scopes reads to the signed-in owner", async () => { m.rows = [quote]; expect(await resumeContractorActivation(quote.company_name)).toBe("/entrepreneur/plan-personnalise/quote-1"); expect(m.eq).toHaveBeenCalledWith("user_id", "owner"); });
  it("opens the professional space only on server-confirmed payment", () => { expect(activationQuoteDestination({ ...quote, pricing_status: "paid" }, quote.company_name)).toBe("/pro"); for (const pricing_status of ["draft", "accepted", "waitlisted"]) expect(activationQuoteDestination({ ...quote, pricing_status }, quote.company_name)).toContain("plan-personnalise"); });
  it("does not resume another company or rejected quote", async () => { m.rows = [{ ...quote, company_name: "Other company" }, { ...quote, pricing_status: "rejected" }]; expect(await resumeContractorActivation(quote.company_name)).toBeNull(); expect(activationQuoteDestination(quote, null)).toBeNull(); });
  it("tolerates accents and punctuation in a confirmed company name", () => { expect(activationQuoteDestination({ ...quote, company_name: "Électricité QA inc." }, "Electricite QA Inc")).toContain("plan-personnalise"); });
  it("fails visibly on database failure instead of restarting intake", async () => { m.error = new Error("unavailable"); await expect(resumeContractorActivation(quote.company_name)).rejects.toThrow("unavailable"); });
  it("uses the canonical guest reference after account creation too", async () => { m.token = "conversation"; m.guest = quote; expect(await resumeContractorActivation(quote.company_name)).toContain("plan-personnalise"); m.user = null; expect(await resumeContractorActivation(quote.company_name)).toContain("plan-personnalise"); m.guest = { ...quote, pricing_status: "paid" }; expect(await resumeContractorActivation(quote.company_name)).toBeNull(); });
  it("leaves an unfinished intake available when no quote exists", async () => { expect(await resumeContractorActivation(quote.company_name)).toBeNull(); m.user = null; expect(await resumeContractorActivation(quote.company_name)).toBeNull(); });
});
