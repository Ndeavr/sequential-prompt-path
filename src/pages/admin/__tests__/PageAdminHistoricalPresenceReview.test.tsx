import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));
import PageAdminHistoricalPresenceReview from "@/pages/admin/PageAdminHistoricalPresenceReview";

const row = {
  contractor_id: "00000000-0000-4000-8000-0000000000aa", stripe_mode: "live", activation_status_at_rule: "active", is_published: true,
  auth_user_exists: true, synthetic_name_hint: true, same_mode_paid_sessions: 0, other_mode_paid_sessions: 0, unknown_mode_paid_sessions: 0,
  same_mode_signed_paid_events: 0, other_mode_signed_paid_events: 0, same_mode_max_paid_amount_cents: null, ledger_actions: null,
  admin_activation_logs: 0, evidence_class: "no_same_mode_payment_published", checkout_impact: "checkout_blocked_until_review",
};

describe("admin historical Presence review", () => {
  it("requires a 20-character reason and sends the decision scoped to the row's Stripe mode", async () => {
    rpc.mockImplementation(async (name: string) => (name === "admin_historical_presence_review_evidence" ? { data: [row], error: null } : { data: { ok: true }, error: null }));
    render(<HelmetProvider><QueryClientProvider client={new QueryClient()}><MemoryRouter><PageAdminHistoricalPresenceReview /></MemoryRouter></QueryClientProvider></HelmetProvider>);
    const confirm = await screen.findByRole("button", { name: "Confirmer le droit" });
    // The synthetic-name hint alone never enables a decision.
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Raison de la décision"), { target: { value: "trop court" } });
    expect(confirm).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Raison de la décision"), { target: { value: "Contrat signé vérifié au dossier admin" } });
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    await waitFor(() => expect(rpc).toHaveBeenCalledWith("review_historical_presence_right", {
      _contractor_id: row.contractor_id, _stripe_mode: "live", _decision: "confirmed", _reason: "Contrat signé vérifié au dossier admin",
    }));
  });
});
