import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } } }));

import FounderMeetingRequest from "@/pages/entrepreneur/FounderMeetingRequest";

afterEach(() => { cleanup(); invoke.mockReset(); });
const NOW = () => new Date("2026-11-12T21:00:00Z");

function fill() {
  render(<MemoryRouter><FounderMeetingRequest lang="fr" topic="commission" onTopicChange={() => {}} now={NOW} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("radio", { name: /11 h 30 à 13 h 00/ }));
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Test" } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Synthétique" } });
  fireEvent.change(screen.getByLabelText("Entreprise"), { target: { value: "Exemple inc." } });
  fireEvent.change(screen.getByLabelText("Courriel"), { target: { value: "qa@example.test" } });
  fireEvent.click(screen.getByRole("checkbox"));
}

describe("Demande de rencontre fondateur", () => {
  it("affiche 3 horaires proposés et les étiquette sous réserve, sans « disponible/réservé »", () => {
    render(<MemoryRouter><FounderMeetingRequest lang="fr" topic="commission" onTopicChange={() => {}} now={NOW} /></MemoryRouter>);
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText(/sous réserve de confirmation/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bdisponibles?\b|\bréservé\b(?! automatiquement)/i);
  });

  it("succès seulement après réponse serveur ok + id; message enregistré avec horaire exact", async () => {
    invoke.mockResolvedValue({ data: { ok: true, id: "00000000-0000-0000-0000-000000000001" }, error: null });
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    await waitFor(() => expect(screen.getByText("Demande envoyée, nous confirmerons le rendez-vous.")).toBeInTheDocument());
    const [fn, { body }] = invoke.mock.calls[0];
    expect(fn).toBe("submit-supplier-partnership");
    expect(body.org_type).toBe("other");
    expect(body.privacy_consent).toBe(true);
    expect(body.message).toContain("début UTC 2026-11-16T16:30:00.000Z");
    expect(body.message).toContain("sous réserve de confirmation");
    expect(document.body.textContent).not.toMatch(/Google|confirmé/);
  });

  it("aucune fausse confirmation si le serveur échoue ou ne renvoie pas d'id", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    fill();
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/n'a pas pu être enregistrée/));
    expect(screen.queryByText(/Demande envoyée/)).toBeNull();
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });

  it("champs requis et consentement : rien n'est envoyé", () => {
    render(<MemoryRouter><FounderMeetingRequest lang="fr" topic="commission" onTopicChange={() => {}} now={NOW} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    expect(invoke).not.toHaveBeenCalled();
    expect(screen.getByText("Choisissez un horaire.")).toBeInTheDocument();
  });
});
