import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ServiceTriageBoard, { type ServiceEntries } from "@/components/contractor-compatibility/ServiceTriageBoard";

const CATALOG = [
  { slug: "isolation_soufflee", label: "Isolation soufflée" },
  { slug: "ventilation_entretoit", label: "Ventilation d'entretoit" },
];

function setup(value: ServiceEntries = {}) {
  const onChange = vi.fn();
  render(<ServiceTriageBoard value={value} catalog={CATALOG} onChange={onChange} />);
  return { onChange };
}

describe("ServiceTriageBoard", () => {
  it("affiche les trois colonnes et aucun bouton de statut répété", () => {
    setup();
    expect(screen.getByText("Prioritaire")).toBeInTheDocument();
    expect(screen.getByText("Accepté")).toBeInTheDocument();
    expect(screen.getByText("Non recherché")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("Ajouter un service…")).toHaveLength(3);
  });

  it("dit clairement qu'aucun service n'est détecté, sans en inventer", () => {
    setup();
    expect(screen.getByText(/Nous n'avons pas encore pu confirmer vos services/)).toBeInTheDocument();
  });

  it("ajoute un service connu dans la bonne colonne", () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("Ajouter un service dans Prioritaire");
    fireEvent.change(input, { target: { value: "Isolation soufflée" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith({
      isolation_soufflee: expect.objectContaining({ stance: "priority", source: "declared", pending_review: false }),
    });
  });

  it("marque un service personnalisé en attente de révision", () => {
    const { onChange } = setup();
    const input = screen.getByLabelText("Ajouter un service dans Accepté");
    fireEvent.change(input, { target: { value: "Scellage de fuites d'air" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenCalledWith({
      scellage_de_fuites_d_air: expect.objectContaining({ stance: "accepted", pending_review: true }),
    });
  });

  it("ignore un doublon, accents et casse confondus", () => {
    const { onChange } = setup({
      isolation_soufflee: { stance: "priority", label: "Isolation soufflée", source: "google", order: 0 },
    });
    const input = screen.getByLabelText("Ajouter un service dans Non recherché");
    fireEvent.change(input, { target: { value: "isolation soufflee" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("affiche la provenance réelle de chaque service", () => {
    setup({ isolation_soufflee: { stance: "priority", label: "Isolation soufflée", source: "google", order: 0 } });
    expect(screen.getByText("Google")).toBeInTheDocument();
  });
});
