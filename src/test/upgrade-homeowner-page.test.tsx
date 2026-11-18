import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { readFileSync } from "node:fs";
import { homeownerFeatureLine } from "@/features/planSystem/homeownerFeatureLabels";

// Lignes synthétiques reprenant la forme réelle de plan_features (home_decouverte).
const FREE_ROWS: [string, number | null][] = [
  ["ai_design_daily", 3], ["ai_design_monthly", 1], ["properties_max", 1], ["property_passport", 1],
  ["quote_analysis_daily", 3], ["quote_analysis_monthly", 1], ["quote_comparison", 3],
];

describe("/upgrade — libellés des avantages", () => {
  it("carte Gratuit : libellés humains, 1 propriété incluse, aucun garde-fou quotidien ni clé brute", () => {
    const lines = FREE_ROWS.map(([k, l]) => homeownerFeatureLine(k, l)).filter(Boolean);
    expect(lines).toEqual([
      "1 design IA par mois", "1 propriété incluse", "Passeport Maison (1 propriété)",
      "1 analyse de soumission par mois", "Comparaison de vos soumissions",
    ]);
    expect(lines.join(" ")).not.toMatch(/_|adresse supplémentaire|par jour|· 3/);
  });
  it("forfaits payants : illimité et plusieurs propriétés lus tels quels", () => {
    expect(homeownerFeatureLine("quote_analysis_monthly", -1)).toBe("Analyses de soumissions illimitées");
    expect(homeownerFeatureLine("ai_design_monthly", 10)).toBe("10 designs IA par mois");
    expect(homeownerFeatureLine("properties_max", 3)).toBe("Jusqu'à 3 propriétés");
    expect(homeownerFeatureLine("alex_priority", null)).toBe("Accompagnement Clara avancé");
  });
  it("une clé inconnue n'est jamais affichée brute", () => {
    expect(homeownerFeatureLine("new_secret_feature", 5)).toBeNull();
  });
});

const plan = { planCode: "home_decouverte", isPaid: false, currentPeriodEnd: null, cancelAtPeriodEnd: false, isLoading: false, refetch: vi.fn() };
let session: unknown = { user: { id: "u-synthetic" } };
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ session }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/planSystem/useHomeownerPlan", async (orig) => ({
  ...(await orig<typeof import("@/features/planSystem/useHomeownerPlan")>()),
  useHomeownerPlan: () => plan,
  useHomeownerPlanCatalog: () => ({ isLoading: false, data: { plans: [], features: [] } }),
}));

async function renderAt(url: string) {
  const { default: Page } = await import("@/pages/upgrade/PageUpgradeHomeowner");
  render(<HelmetProvider><MemoryRouter initialEntries={[url]}><Page /></MemoryRouter></HelmetProvider>);
}

describe("/upgrade — retour de paiement", () => {
  beforeEach(() => { plan.planCode = "home_decouverte"; session = { user: { id: "u-synthetic" } }; vi.useRealTimers(); });

  it("?success sans abonnement confirmé côté serveur : vérification, jamais « Paiement confirmé »", async () => {
    await renderAt("/upgrade?success=1&plan=plus");
    expect(screen.getByTestId("upgrade-return-status").textContent).toMatch(/vérifions/);
    expect(screen.queryByText(/Paiement confirmé/)).toBeNull();
  });
  it("?success après expiration des vérifications : message en attente, aucun accès activé", async () => {
    vi.useFakeTimers();
    await renderAt("/upgrade?success=1&plan=plus");
    for (let i = 0; i < 11; i++) await act(async () => { vi.advanceTimersByTime(3000); });
    expect(screen.getByTestId("upgrade-return-status").textContent).toMatch(/pas encore reçue/);
    expect(plan.refetch).toHaveBeenCalled();
  });
  it("?success déconnecté : aucune confirmation", async () => {
    session = null;
    await renderAt("/upgrade?success=1&plan=plus");
    expect(screen.getByTestId("upgrade-return-status").textContent).toMatch(/Connectez-vous/);
  });
  it("confirmation seulement si le plan lu côté serveur correspond au plan payé", async () => {
    plan.planCode = "home_plus";
    await renderAt("/upgrade?success=1&plan=plus");
    expect(screen.getByTestId("upgrade-return-status").textContent).toBe("Paiement confirmé. Votre plan est actif.");
  });
  it("?canceled : message neutre, sans affirmer de prélèvement", async () => {
    await renderAt("/upgrade?canceled=1");
    expect(screen.getByTestId("upgrade-return-status").textContent).toBe("Paiement interrompu. Votre plan actuel reste inchangé.");
  });
});

describe("Clara, pas Alex, dans les surfaces modifiées", () => {
  it("aucun « Alex » visible dans /upgrade, ses libellés ni le paiement propriétaire", () => {
    for (const f of ["src/pages/upgrade/PageUpgradeHomeowner.tsx", "src/features/planSystem/homeownerFeatureLabels.ts", "supabase/functions/create-homeowner-checkout/index.ts"]) {
      const visible = readFileSync(f, "utf8").replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, "").match(/["'`>][^"'`<]*\bAlex\b/g);
      expect(visible, f).toBeNull();
    }
  });
});
