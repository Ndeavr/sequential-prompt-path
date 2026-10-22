import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import RegisterPropertyCTA from "@/components/home-light/RegisterPropertyCTA";

const mocks = vi.hoisted(() => ({ authenticated: false, navigate: vi.fn(), open: vi.fn(), role: vi.fn() }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ isAuthenticated: mocks.authenticated, isLoading: false }) }));
vi.mock("@/hooks/useAuthOverlay", () => ({ openAuthOverlay: mocks.open }));
vi.mock("@/services/auth/roleIntent", () => ({ saveRoleIntent: mocks.role }));

describe("property registration handoff", () => {
  beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.authenticated = false; });
  it("keeps a guest on Clara and resumes property creation after auth", () => {
    render(<RegisterPropertyCTA lang="fr" />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer ma propriété maintenant" }));
    expect(mocks.role).toHaveBeenCalledWith("homeowner", { returnPath: "/dashboard/properties/new" });
    expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ action: "register_property", returnPath: "/dashboard/properties/new" }));
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("offers the same free signup handoff without a second flow", () => {
    render(<RegisterPropertyCTA lang="fr" />);
    fireEvent.click(screen.getByRole("button", { name: "Créer mon compte (c’est gratuit)" }));
    expect(mocks.open).toHaveBeenCalledTimes(1);
    expect(mocks.open).toHaveBeenCalledWith(expect.objectContaining({ returnPath: "/dashboard/properties/new" }));
  });
  it("takes an authenticated user straight to the existing property form", () => {
    mocks.authenticated = true;
    render(<RegisterPropertyCTA lang="fr" />);
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer ma propriété maintenant" }));
    expect(mocks.navigate).toHaveBeenCalledWith("/dashboard/properties/new");
    expect(mocks.open).not.toHaveBeenCalled();
    expect(mocks.role).not.toHaveBeenCalled();
  });
});