import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ClaraMatchingDemo from "@/components/home-light/ClaraMatchingDemo";

const state = vi.hoisted(() => ({ lang: "fr" as "fr" | "en" }));
vi.mock("@/components/ui/LanguageToggle", () => ({
  useLanguage: () => ({ lang: state.lang }),
}));

afterEach(() => {
  cleanup();
  state.lang = "fr";
});

describe("ClaraMatchingDemo", () => {
  it("changes only a fictitious preview and opens the existing real Clara flow", () => {
    const onStartProject = vi.fn();
    render(<ClaraMatchingDemo onStartProject={onStartProject} />);

    expect(screen.getByRole("heading", { name: /Pas un annuaire/ })).toBeInTheDocument();
    expect(screen.getByText(/Démonstration fictive/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Travaux de plomberie" }));
    fireEvent.click(screen.getByRole("button", { name: "Terrebonne" }));
    fireEvent.click(screen.getByRole("button", { name: "Disponibilité" }));

    expect(screen.getByText("Services de plomberie adaptés au projet")).toBeInTheDocument();
    expect(screen.getAllByText("Terrebonne").length).toBeGreaterThan(1);
    expect(screen.getByText("Capacité et créneaux à confirmer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Disponibilité" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Décrire mon vrai projet à Clara/ }));
    expect(onStartProject).toHaveBeenCalledTimes(1);
    expect(document.body.textContent).not.toMatch(/rendez-vous confirmé|professionnel vérifié|client garanti/i);
  });

  it("supports English without changing the conversion action", () => {
    state.lang = "en";
    const onStartProject = vi.fn();
    render(<ClaraMatchingDemo onStartProject={onStartProject} />);

    expect(screen.getByRole("heading", { name: /Not a directory/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Plumbing work" }));
    expect(screen.getByText("Plumbing services suited to the project")).toBeInTheDocument();
    expect(screen.getByText(/Illustrative demo:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Describe my real project to Clara/ }));
    expect(onStartProject).toHaveBeenCalledTimes(1);
  });
});
