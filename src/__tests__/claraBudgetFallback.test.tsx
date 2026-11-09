import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const invoke = vi.fn();
const fetchPricingQuote = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));
vi.mock("@/services/contractorPricingQuoteService", () => ({ fetchPricingQuote: (id: string) => fetchPricingQuote(id) }));
vi.mock("@/lib/analytics/funnelSteps", () => ({ trackFunnelStep: vi.fn() }));

import { ClaraBudgetFallback } from "@/components/contractor-plan/ClaraBudgetFallback";

const quote = { id: "11111111-1111-4111-8111-111111111111", target_monthly_appointments: 80, input_payload: { trade_primary: "Paysagiste", target_monthly_appointments: 80, pricing_mode: "goal" } } as never;

describe("ClaraBudgetFallback", () => {
  beforeEach(() => { invoke.mockReset(); fetchPricingQuote.mockReset(); });

  it("hesitation → one budget question → free amount → server-solved offer", async () => {
    invoke.mockResolvedValue({ data: { quote_id: "q2" }, error: null });
    fetchPricingQuote.mockResolvedValue({ id: "q2", recommended_monthly_price: 20000, guaranteed_appointments: 1, input_payload: {} });
    const onQuote = vi.fn();
    render(<ClaraBudgetFallback quote={quote} initialTarget={80} onQuote={onQuote} onPresence={vi.fn()} />);
    fireEvent.click(screen.getAllByTestId("budget-hesitation-chip")[0]);
    expect(screen.getAllByText("Avec quel budget mensuel seriez-vous à l'aise pour commencer?")).toHaveLength(1);
    fireEvent.change(screen.getByTestId("clara-budget-input"), { target: { value: "250 $" } });
    fireEvent.click(screen.getByTestId("clara-budget-submit"));
    await waitFor(() => expect(onQuote).toHaveBeenCalled());
    const body = invoke.mock.calls[0][1].body;
    expect(body).toMatchObject({ pricing_mode: "budget", monthly_budget_cents: 25000, target_monthly_appointments: 80 });
    expect(screen.getByText(/Avec 250 \$\/mois, voici ce que nous pouvons vous offrir : 1 rendez-vous qualifié exclusif inclus par mois/)).toBeTruthy();
    expect(screen.queryByTestId("budget-presence-only")).toBeNull();
  });

  it("insufficient budget: says so and offers Présence IA alone, no plan", async () => {
    invoke.mockResolvedValue({ data: { quote_id: "q3" }, error: null });
    fetchPricingQuote.mockResolvedValue({ id: "q3", recommended_monthly_price: 4900, guaranteed_appointments: 0, input_payload: {} });
    const onPresence = vi.fn();
    render(<ClaraBudgetFallback quote={quote} initialTarget={80} onQuote={vi.fn()} onPresence={onPresence} />);
    fireEvent.click(screen.getAllByTestId("budget-hesitation-chip")[1]);
    fireEvent.change(screen.getByTestId("clara-budget-input"), { target: { value: "80" } });
    fireEvent.click(screen.getByTestId("clara-budget-submit"));
    await waitFor(() => expect(screen.getByTestId("budget-presence-only")).toBeTruthy());
    fireEvent.click(screen.getByTestId("budget-presence-only"));
    expect(onPresence).toHaveBeenCalled();
  });

  it("ambiguous answer: no server call, asks for one amount", () => {
    render(<ClaraBudgetFallback quote={quote} initialTarget={80} onQuote={vi.fn()} onPresence={vi.fn()} />);
    fireEvent.click(screen.getAllByTestId("budget-hesitation-chip")[2]);
    fireEvent.change(screen.getByTestId("clara-budget-input"), { target: { value: "entre 200 et 300" } });
    fireEvent.click(screen.getByTestId("clara-budget-submit"));
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.getByText(/Indiquez un seul montant par mois/)).toBeTruthy();
  });
});
