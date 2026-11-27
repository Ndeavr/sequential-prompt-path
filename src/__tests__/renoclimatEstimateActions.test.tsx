import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import GrantEstimateActions from "@/pages/calculators/GrantEstimateActions";
import { GRANT_ESTIMATE_KEY } from "@/lib/grantEstimateSnapshot";
import type { GrantInputs } from "@/lib/grantCalculator2026";

const mocks = vi.hoisted(() => ({
  metadata: null as Record<string, unknown> | null,
  updateUser: vi.fn(),
}));

vi.mock("@/stores/authSessionStore", () => ({
  useAuthSession: () => ({
    session: mocks.metadata && { user: { user_metadata: mocks.metadata } },
    loading: false,
  }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { updateUser: mocks.updateUser } },
}));
vi.mock("@/components/auth/PhoneOtpForm", () => ({ default: () => <p>Connexion par SMS</p> }));

const inputs: GrantInputs = {
  selected: ["toit"], building: "maison", regime: "nouveau",
  roofType: "grenier", roofArea: 800, roofRAdded: 40, roofRFinal: 60,
  wallsArea: 0, wallsRAdded: 0, foundationType: "murs-sous-sol", foundationArea: 0,
  foundationRAdded: 0, windowCount: 0, windowsMostEfficient: false,
};
const url = "https://unpro.ca/subventions/renoclimat";

beforeEach(() => {
  mocks.metadata = null;
  mocks.updateUser.mockReset().mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("ouvre la connexion avant de sauvegarder puis enregistre dans le compte", async () => {
  const onRestore = vi.fn();
  const page = render(<GrantEstimateActions inputs={inputs} onRestore={onRestore} url={url} />);
  fireEvent.click(screen.getByRole("button", { name: "Sauvegarder" }));
  expect(screen.getByText("Connexion par SMS")).toBeTruthy();
  expect(mocks.updateUser).not.toHaveBeenCalled();

  mocks.metadata = {};
  page.rerender(<GrantEstimateActions inputs={inputs} onRestore={onRestore} url={url} />);
  fireEvent.click(screen.getByRole("button", { name: "Sauvegarder mon estimation" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mocks.updateUser).toHaveBeenCalledWith({ data: { [GRANT_ESTIMATE_KEY]: inputs } });

  mocks.metadata = { [GRANT_ESTIMATE_KEY]: inputs };
  page.rerender(<GrantEstimateActions inputs={inputs} onRestore={onRestore} url={url} />);
  fireEvent.click(screen.getByRole("button", { name: "Reprendre mon estimation" }));
  expect(onRestore).toHaveBeenCalledWith(inputs);
});

it("partage uniquement l’URL publique", async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { share });
  render(<GrantEstimateActions inputs={inputs} onRestore={vi.fn()} url={url} />);
  fireEvent.click(screen.getByRole("button", { name: "Partager la page" }));
  expect(share).toHaveBeenCalledWith({ title: "Calculateur Rénoclimat · UNPRO", url });
});
