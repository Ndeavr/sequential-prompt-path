import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

const invoke = vi.fn();
const fetchPricingQuote = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock("@/services/contractorPricingQuoteService", () => ({ fetchPricingQuote: (...a: unknown[]) => fetchPricingQuote(...a) }));

import { PlanGoalAdjuster, type GoalAdjusterState } from "@/components/contractor-plan/PlanGoalAdjuster";
import { goalQuotePatch } from "@/lib/pricing/planGoalModel";

const inputs = { kind: "sales" as const, amount: 120000, horizonMonths: 12, basket: 3000, conversionPct: 25, marginPct: null, capacityPerMonth: 20, appointmentsPerMonth: 14, sizes: [] };
const quote = (id: string, appts: number) => ({
  id, target_monthly_appointments: appts, recommended_monthly_price: 50000, recommended_plan: "pro_v2",
  input_payload: { ...goalQuotePatch(inputs, appts) },
}) as never;

describe("plan personnalisé : curseur, saisie, devis périmé", () => {
  beforeEach(() => { invoke.mockReset(); fetchPricingQuote.mockReset(); });

  it("affiche le calcul exact et ignore une réponse serveur tardive", async () => {
    const onQuote = vi.fn();
    const states: GoalAdjusterState[] = [];
    let releaseSlow: (v: unknown) => void = () => {};
    invoke
      .mockImplementationOnce(() => new Promise((r) => { releaseSlow = r; }))
      .mockImplementationOnce(() => Promise.resolve({ data: { quote_id: "q-fast" }, error: null }));
    fetchPricingQuote.mockImplementation(async (id: string) => quote(id, id === "q-fast" ? 18 : 16));
    render(<PlanGoalAdjuster quote={quote("q0", 14)} onQuote={onQuote} onState={(s) => states.push(s)} />);

    expect(screen.getByTestId("needs-contracts").textContent).toBe("40 contrats");
    expect(screen.getByTestId("needs-appointments").textContent).toBe("160 rendez-vous");
    expect(screen.getByTestId("needs-monthly").textContent).toBe("14 rendez-vous par mois");
    expect(states.at(-1)?.dirty).toBe(false);

    fireEvent.change(screen.getByTestId("goal-appointments-range"), { target: { value: "16" } });
    await waitFor(() => expect(invoke).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(states.at(-1)?.dirty).toBe(true); // paiement bloqué tant que le devis est périmé

    fireEvent.change(screen.getByTestId("goal-appointments-input"), { target: { value: "18" } });
    await waitFor(() => expect(onQuote).toHaveBeenCalledTimes(1), { timeout: 2000 });
    expect(onQuote.mock.calls[0][0].id).toBe("q-fast");
    expect(screen.getByTestId("outcome-revenue").textContent).toContain("13");

    await act(async () => { releaseSlow({ data: { quote_id: "q-slow" }, error: null }); await Promise.resolve(); });
    await new Promise((r) => setTimeout(r, 50));
    expect(onQuote).toHaveBeenCalledTimes(1); // la réponse périmée n'est jamais appliquée
  });

  it("saisie mobile : valeur plafonnée à la capacité; objectif de profit sans marge bloque", async () => {
    render(<PlanGoalAdjuster quote={quote("q0", 14)} onQuote={vi.fn()} onState={vi.fn()} />);
    fireEvent.change(screen.getByTestId("goal-appointments-input"), { target: { value: "99" } });
    expect((screen.getByTestId("goal-appointments-input") as HTMLInputElement).value).toBe("20");
    expect(screen.getByTestId("goal-appointments-input").getAttribute("inputmode")).toBe("numeric");
    fireEvent.click(screen.getByRole("radio", { name: "Profit ajouté" }));
    expect(screen.getByTestId("goal-errors").textContent).toContain("marge");
  });

  it("répartition inégale : 750 $/RDV dans le composant, total invalide bloque, normalisation explicite, taille seule = devis périmé", async () => {
    const states: GoalAdjusterState[] = [];
    invoke.mockImplementation(() => new Promise(() => {})); // aucun devis ne revient : le paiement reste bloqué
    render(<PlanGoalAdjuster quote={quote("q0", 14)} onQuote={vi.fn()} onState={(s) => states.push(s)} />);
    fireEvent.click(screen.getByTestId("toggle-sizes"));
    const type = (id: string, v: string) => fireEvent.change(screen.getByTestId(id), { target: { value: v } });
    type("size-share-small", "50"); type("size-basket-small", "1000"); type("size-conv-small", "50");
    type("size-share-large", "30"); type("size-basket-large", "10000"); type("size-conv-large", "10");
    expect(screen.getByTestId("goal-errors").textContent).toContain("totaliser 100 %");
    expect(states.at(-1)?.dirty).toBe(true);
    fireEvent.click(screen.getByTestId("normalize-sizes"));
    expect(screen.queryByTestId("goal-errors")).toBeNull();
    // 50/30 → 62,5/37,5 : Σ w·b·c = 0,625·500 + 0,375·1000 = 687,50 $
    expect(screen.getByTestId("goal-needs").textContent).toContain("688");
    type("size-share-small", "50"); type("size-share-large", "50");
    expect(screen.getByTestId("goal-needs").textContent).toContain("750");
    expect(screen.getByTestId("goal-needs").textContent).not.toContain("1 650");
    type("size-conv-large", "0");
    expect(screen.getByTestId("goal-errors").textContent).toContain("conversion entre 1 % et 100 %");
    type("size-conv-large", "10");
    fireEvent.click(screen.getByTestId("size-medium-refused"));
    await waitFor(() => expect(invoke).toHaveBeenCalled(), { timeout: 2000 });
    const body = invoke.mock.calls.at(-1)?.[1]?.body as Record<string, any>;
    expect(body.project_size_mix.share_unit).toBe("appointments");
    expect(body.project_size_mix.sizes.find((x: any) => x.code === "medium").stance).toBe("refused");
    expect(body.close_rate_estimate).toBeCloseTo(0.3, 9);
    expect(states.at(-1)?.dirty).toBe(true);
  });
});
