import { describe, expect, it } from "vitest";
import { addressCors, guestAddressSessionAllowed } from "../../supabase/functions/_shared/addressRequestPolicy";

describe("P0 — adresse publique sécurisée", () => {
  it("accepte un visiteur avec session invitée existante sans inscription", () => {
    expect(guestAddressSessionAllowed({ id: "guest", user_id: null }, null)).toBe(true);
  });
  it("refuse un jeton inconnu et une session déjà rattachée à un autre compte", () => {
    expect(guestAddressSessionAllowed(null, null)).toBe(false);
    expect(guestAddressSessionAllowed({ id: "private", user_id: "owner" }, null)).toBe(false);
    expect(guestAddressSessionAllowed({ id: "private", user_id: "owner" }, "other")).toBe(false);
  });
  it("autorise uniquement les origines publiques du projet, jamais wildcard", () => {
    expect(addressCors("https://unpro.ca")?.["Access-Control-Allow-Origin"]).toBe("https://unpro.ca");
    expect(addressCors("http://localhost:8080")?.["Access-Control-Allow-Origin"]).toBe("http://localhost:8080");
    expect(addressCors("https://unpro.ca.attacker.example")).toBeNull();
    expect(addressCors("https://attacker.lovable.app")).toBeNull();
  });
});