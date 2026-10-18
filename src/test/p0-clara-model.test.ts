import { afterEach, describe, expect, it, vi } from "vitest";
import { summarizeContractorAnswer } from "../../supabase/functions/_shared/claraQualificationSummary";
import { CLARA_EXTRACTION_MODEL } from "../../supabase/functions/_shared/claraModelSelection";
afterEach(() => vi.unstubAllGlobals());
describe("P0 — extraction compatible et erreurs sans faux résumé", () => {
  it("envoie le modèle confirmé et préserve le contrat JSON", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ patch: { primary_trade: "Entretien de gazon" }, clarification: null }) } }] })));
    vi.stubGlobal("fetch", fetcher);
    const response = await summarizeContractorAnswer({ answer: "Entretien de gazon", known: {} }, "test-only", {});
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent.model).toBe("google/gemini-3.1-flash-lite");
    expect(sent.response_format).toEqual({ type: "json_object" });
    expect(await response.json()).toEqual({ patch: { primary_trade: "Entretien de gazon" }, clarification: null });
    expect(CLARA_EXTRACTION_MODEL).toBe(sent.model);
  });
  it("une panne ne fabrique aucune qualification et ne relance pas le fournisseur", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetcher);
    const response = await summarizeContractorAnswer({ answer: "Entretien de gazon" }, "test-only", {});
    expect(response.status).toBe(502);
    expect((await response.json()).patch).toBeUndefined();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});