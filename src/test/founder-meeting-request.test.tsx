import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

type Res = { data: unknown; error: unknown };
const handlers: Record<string, (body: Record<string, unknown>) => Promise<Res>> = {};
const calls: { fn: string; body: Record<string, unknown> }[] = [];
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (fn: string, opts: { body: Record<string, unknown> }) => { calls.push({ fn, body: opts.body }); return handlers[fn](opts.body); } } },
}));

import FounderMeetingRequest from "@/pages/entrepreneur/FounderMeetingRequest";

afterEach(() => { cleanup(); calls.length = 0; for (const k of Object.keys(handlers)) delete handlers[k]; });
const NOW = () => new Date("2026-11-12T21:00:00Z");
const LIVE = [
  { start: "2026-11-17T15:00:00.000Z", end: "2026-11-17T16:30:00.000Z" },
  { start: "2026-11-17T16:30:00.000Z", end: "2026-11-17T18:00:00.000Z" },
  { start: "2026-11-18T18:00:00.000Z", end: "2026-11-18T19:30:00.000Z" },
];
const pendingOk = () => { handlers["submit-supplier-partnership"] = async () => ({ data: { ok: true, id: "00000000-0000-0000-0000-000000000001" }, error: null }); };

function mount() {
  render(<MemoryRouter><FounderMeetingRequest lang="fr" topic="commission" onTopicChange={() => {}} now={NOW} /></MemoryRouter>);
}
async function fill(radioName: RegExp) {
  fireEvent.click(await screen.findByRole("radio", { name: radioName }));
  fireEvent.change(screen.getByLabelText("Prénom"), { target: { value: "Test" } });
  fireEvent.change(screen.getByLabelText("Nom"), { target: { value: "Synthétique" } });
  fireEvent.change(screen.getByLabelText("Entreprise"), { target: { value: "Exemple inc." } });
  fireEvent.change(screen.getByLabelText("Courriel"), { target: { value: "qa@example.test" } });
  fireEvent.click(screen.getByRole("checkbox"));
}
const bookCalls = () => calls.filter((c) => c.fn === "founder-meeting" && c.body.action === "book");

describe("Rencontre fondateur — agenda réel indisponible (repli)", () => {
  it("3 horaires proposés, étiquetés sous réserve; demande enregistrée seulement avec ok + id", async () => {
    handlers["founder-meeting"] = async () => ({ data: { mode: "unavailable", reason: "calendar_reauth_required" }, error: null });
    pendingOk();
    mount();
    expect(await screen.findAllByRole("radio")).toHaveLength(3);
    expect(screen.getByText(/sous réserve de confirmation/)).toBeInTheDocument();
    await fill(/11 h 30 à 13 h 00/);
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    await waitFor(() => expect(screen.getByText("Demande envoyée, nous confirmerons le rendez-vous.")).toBeInTheDocument());
    expect(bookCalls()).toHaveLength(0);
    const pending = calls.find((c) => c.fn === "submit-supplier-partnership")!;
    expect(String(pending.body.message)).toContain("début UTC 2026-11-16T16:30:00.000Z");
    expect(screen.queryByText(/Rendez-vous confirmé/)).toBeNull();
  });

  it("aucune fausse confirmation si l'enregistrement échoue", async () => {
    handlers["founder-meeting"] = async () => { throw new Error("offline"); };
    handlers["submit-supplier-partnership"] = async () => ({ data: { ok: true }, error: null });
    mount();
    await fill(/10 h 00 à 11 h 30/);
    fireEvent.click(screen.getByRole("button", { name: "Envoyer ma demande" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/n'a pas pu être enregistrée/));
    expect(screen.queryByText(/Demande envoyée|confirmé/)).toBeNull();
  });
});

describe("Rencontre fondateur — agenda réel (live)", () => {
  it("affiche les 3 moments libres renvoyés par le serveur et confirme seulement sur status confirmed", async () => {
    handlers["founder-meeting"] = async (b) => b.action === "slots"
      ? { data: { mode: "live", slots: LIVE }, error: null }
      : { data: { status: "confirmed", slot: LIVE[1] }, error: null };
    mount();
    const radios = await screen.findAllByRole("radio");
    expect(radios).toHaveLength(3);
    expect(screen.getByText("Mardi 17 novembre, 11 h 30 à 13 h 00 (HNE)")).toBeInTheDocument();
    expect(screen.queryByText(/sous réserve de confirmation/)).toBeNull();
    await fill(/mardi 17 novembre, 11 h 30/i);
    fireEvent.change(screen.getByLabelText(/Domaine et territoire/), { target: { value: "Toiture, Laval" } });
    fireEvent.click(screen.getByRole("button", { name: "Réserver ce moment" }));
    await waitFor(() => expect(screen.getByText("Rendez-vous confirmé.")).toBeInTheDocument());
    const b = bookCalls()[0].body;
    expect(b.slot_start).toBe(LIVE[1].start);
    expect(b.domain_territory).toBe("Toiture, Laval");
    expect(String(b.idempotency_key)).toMatch(/^[0-9a-f-]{36}$/);
    expect(calls.some((c) => c.fn === "submit-supplier-partnership")).toBe(false);
  });

  it("conflit : nouveaux moments affichés, nouvelle clé, aucun succès", async () => {
    const fresh = [{ start: "2026-11-19T15:00:00.000Z", end: "2026-11-19T16:30:00.000Z" }];
    handlers["founder-meeting"] = async (b) => b.action === "slots"
      ? { data: { mode: "live", slots: LIVE }, error: null }
      : { data: { status: "conflict", reason: "slot_busy", slots: fresh }, error: null };
    mount();
    await fill(/mardi 17 novembre, 10 h 00/i);
    fireEvent.click(screen.getByRole("button", { name: "Réserver ce moment" }));
    await waitFor(() => expect(screen.getByText(/Ce moment vient d'être pris/)).toBeInTheDocument());
    expect(screen.getAllByRole("radio")).toHaveLength(1);
    expect(screen.queryByText(/Rendez-vous confirmé|Demande envoyée/)).toBeNull();
    fireEvent.click(screen.getByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "Réserver ce moment" }));
    await waitFor(() => expect(bookCalls()).toHaveLength(2));
    expect(bookCalls()[0].body.idempotency_key).not.toBe(bookCalls()[1].body.idempotency_key);
  });

  it("interruption Google (fallback) : demande en attente via le flux existant, jamais « confirmé »", async () => {
    handlers["founder-meeting"] = async (b) => b.action === "slots"
      ? { data: { mode: "live", slots: LIVE }, error: null }
      : { data: { status: "fallback", reason: "event_insert_network" }, error: null };
    pendingOk();
    mount();
    await fill(/mardi 17 novembre, 10 h 00/i);
    fireEvent.click(screen.getByRole("button", { name: "Réserver ce moment" }));
    await waitFor(() => expect(screen.getByText("Demande envoyée, nous confirmerons le rendez-vous.")).toBeInTheDocument());
    expect(screen.getByText(/La réservation automatique n'a pas pu être faite/)).toBeInTheDocument();
    const pending = calls.find((c) => c.fn === "submit-supplier-partnership")!;
    expect(String(pending.body.message)).toContain("Réservation automatique non effectuée");
    expect(screen.queryByText(/Rendez-vous confirmé/)).toBeNull();
  });

  it("champs requis : aucun appel de réservation", async () => {
    handlers["founder-meeting"] = async () => ({ data: { mode: "live", slots: LIVE }, error: null });
    mount();
    fireEvent.click(await screen.findByRole("button", { name: "Réserver ce moment" }));
    expect(bookCalls()).toHaveLength(0);
    expect(screen.getByText("Choisissez un horaire.")).toBeInTheDocument();
  });
});
