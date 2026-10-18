import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import FirstRevenueTracker from "@/components/admin/outreach/FirstRevenueTracker";

const snap = { activations_today: 2, activations_7d: 3, activations_30d: 3, contacted_7d: 0, contacted_30d: 0,
  registrations_7d: 0, profiles_completed_7d: 0, paid_plans_active: 4, last_activation_at: null, alert_no_activation_48h: false };

describe("FirstRevenueTracker — vérité des KPI", () => {
  it("n'invente aucun montant à partir des comptes (pas 700 $ ni 1 396 $)", () => {
    const { container } = render(<FirstRevenueTracker snapshot={snap} />);
    expect(container.textContent).not.toMatch(/700|1\s?396/);
    expect(screen.getAllByText("Non disponible")).toHaveLength(2);
  });
});
