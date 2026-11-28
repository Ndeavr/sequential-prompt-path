import { afterEach, describe, expect, it, vi } from "vitest";
import { handleRenoBullesTurn, RENO_BULLES_ORIGIN } from "../../supabase/functions/_shared/renoBullesTurn";
import { CLARA_EXTRACTION_MODEL } from "../../supabase/functions/_shared/claraModelSelection";

const origin = RENO_BULLES_ORIGIN;
let requestNumber = 0;
function request(body: unknown) {
  requestNumber += 1;
  return new Request("https://backend.example/functions/v1/alex-chat", {
    method: "POST",
    headers: { origin, "cf-connecting-ip": `203.0.113.${requestNumber}` },
    body: JSON.stringify(body),
  });
}
function turn(message: string, state: object = {}, history: Array<{ role: "user" | "assistant"; content: string }> = []) {
  return { action: "reno_bulles_turn", message, history, state };
}
function modelReply(reply: string, facts: object = {}, ready = false, choices: Array<{ label: string; value: string }> = []) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({
    reply,
    choices,
    facts: {
      service: null, city: null, address: null, propertyType: null, problem: null,
      surface: null, area: null, material: null, timing: null, availability: null,
      priority: null, budget: null, confirmedLocation: false, ...facts,
    }, ready,
  }) } }] }));
}

afterEach(() => vi.unstubAllGlobals());

describe("Réno-Bulles — contrat backend isolé", () => {
  it("utilise le modèle canonique, le JSON structuré et l’origine explicite", async () => {
    const fetcher = vi.fn().mockResolvedValue(modelReply("Quelle pièce souhaitez-vous peinturer ?", { service: "peinture" }));
    vi.stubGlobal("fetch", fetcher);
    const response = await handleRenoBullesTurn(request(turn("Je veux peinturer une pièce")), turn("Je veux peinturer une pièce"), "test-only", {}, 100);
    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(origin);
    const sent = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(sent.model).toBe(CLARA_EXTRACTION_MODEL);
    expect(sent.response_format).toEqual({ type: "json_object" });
    expect(sent.max_tokens).toBe(900);
    expect((await response.json()).facts.service).toBe("peinture");
  });

  it("refuse les messages trop longs sans appeler le modèle", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await handleRenoBullesTurn(request(turn("x".repeat(2001))), turn("x".repeat(2001)), "test-only", {}, 100);
    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("efface la localisation après Non à sa confirmation", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelReply("Ancienne réponse", {
      city: "Laval", address: "1 rue Test", confirmedLocation: true,
    })));
    const state = {
      knownHome: { city: "Laval" },
      currentQuestion: "On continue avec votre résidence à Laval ?",
      facts: { city: "Laval", address: "1 rue Test", confirmedLocation: true },
    };
    const response = await handleRenoBullesTurn(request(turn("Non", state)), turn("Non", state), "test-only", {}, 100);
    const result = await response.json();
    expect(result.facts.city).toBeNull();
    expect(result.facts.address).toBeNull();
    expect(result.facts.confirmedLocation).toBe(false);
    expect(result.reply).toContain("nouvelle ville ou adresse");
  });

  it("n’autorise aucune action de réservation sur un profil prototype", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelReply("Voici ce profil.", {}, false, [
      { label: "Réserver", value: "bookPro" },
      { label: "Retour", value: "back" },
      { label: "Lien", value: "https://example.com" },
    ])));
    const state = { selectedProfile: { name: "Prototype", isDemo: true, availableActions: ["bookPro", "back"] } };
    const response = await handleRenoBullesTurn(request(turn("Je veux réserver", state)), turn("Je veux réserver", state), "test-only", {}, 100);
    const result = await response.json();
    expect(result.choices).toEqual([{ label: "Retour", value: "back" }]);
    expect(result.reply).toContain("aucune réservation réelle");
  });

  it("retient ready seulement avec une qualification utile", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelReply("C’est noté.", { service: "peinture" }, true)));
    const response = await handleRenoBullesTurn(request(turn("Une pièce à peinturer")), turn("Une pièce à peinturer"), "test-only", {}, 100);
    expect((await response.json()).ready).toBe(false);
  });

  it("refuse une sortie qui pose deux questions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(modelReply("Quelle pièce ? Dans quelle ville ?")));
    const response = await handleRenoBullesTurn(request(turn("Je veux peinturer")), turn("Je veux peinturer"), "test-only", {}, 100);
    expect(response.status).toBe(502);
    expect((await response.json()).error).toBe("invalid_model_output");
  });

  it("refuse une origine inconnue pour cette action seulement", async () => {
    const req = new Request("https://backend.example/functions/v1/alex-chat", {
      method: "POST", headers: { origin: "https://attacker.example" }, body: JSON.stringify(turn("Bonjour")),
    });
    const response = await handleRenoBullesTurn(req, turn("Bonjour"), "test-only", {}, 100);
    expect(response.status).toBe(403);
  });
});
