/**
 * P0 régression — chemins affilié & partenaire.
 *
 * Un visiteur qui choisit « Ambassadeur » ou « Partenaire » ne doit JAMAIS
 * être envoyé dans le flux propriétaire : chacun a un parcours dédié,
 * vérifié côté serveur. Le sélecteur de rôle connecté doit aussi mener
 * chaque rôle à son véritable espace (jamais /dashboard par défaut).
 */
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
const upsert = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    from: () => ({ upsert: (...args: unknown[]) => upsert(...args) }),
    rpc: vi.fn(),
  },
}));
vi.mock("@/lib/analytics/logFunnelEvent", () => ({ logFunnelEvent: vi.fn() }));

import { roleHomePath, ROLE_LABELS } from "@/services/navigation/roleHome";
import {
  applyRoleIntent,
  clearRoleIntent,
  destinationForRole,
  readRoleIntent,
  saveRoleIntent,
} from "@/services/auth/roleIntent";
import PreLoginRolePage from "@/pages/PreLoginRolePage";

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="path">{loc.pathname}</div>;
}

function renderRolePage() {
  return render(
    <MemoryRouter initialEntries={["/role"]}>
      <Routes>
        <Route path="/role" element={<PreLoginRolePage />} />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("chemins affilié / partenaire", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearRoleIntent();
    invoke.mockReset();
    upsert.mockReset();
    upsert.mockResolvedValue({ error: null });
  });

  it("« Ambassadeur » mène à la page d'information affiliés, pas au login propriétaire", () => {
    renderRolePage();
    fireEvent.click(screen.getByText("Plus d'options"));
    fireEvent.click(screen.getByText("Ambassadeur"));
    fireEvent.click(screen.getByText("Continuer"));
    expect(screen.getByTestId("path").textContent).toBe("/affilies");
    // Aucune intention propriétaire ne doit être persistée.
    expect(readRoleIntent()).toBeNull();
  });

  it("« Partenaire » mène au parcours dédié partenaire, pas au login propriétaire", () => {
    renderRolePage();
    fireEvent.click(screen.getByText("Plus d'options"));
    fireEvent.click(screen.getByText("Partenaire"));
    fireEvent.click(screen.getByText("Continuer"));
    expect(screen.getByTestId("path").textContent).toBe("/partenaire/devenir-partenaire");
    expect(readRoleIntent()).toBeNull();
  });

  it("une intention affilié/partenaire résiduelle ne bloque pas la connexion et n'écrit aucun rôle", async () => {
    saveRoleIntent("affiliate");
    const outcome = await applyRoleIntent({ id: "u-1", email: "a@b.ca" });
    expect(outcome).toEqual({ role: "affiliate", applied: true });
    expect(invoke).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(readRoleIntent()).toBeNull();
  });

  it("la destination post-login affilié existe et n'est pas une route morte", () => {
    expect(destinationForRole("affiliate")).toBe("/affilies/onboarding");
  });

  it("chaque rôle bascule vers son véritable espace", () => {
    expect(roleHomePath("admin")).toBe("/admin");
    expect(roleHomePath("contractor")).toBe("/pro");
    expect(roleHomePath("partner")).toBe("/partenaire/dashboard");
    expect(roleHomePath("affiliate")).toBe("/affiliate");
    expect(roleHomePath("homeowner")).toBe("/dashboard");
  });

  it("le libellé Affilié existe dans le sélecteur de rôle", () => {
    expect(ROLE_LABELS.affiliate.fr).toBe("Affilié");
  });
});
