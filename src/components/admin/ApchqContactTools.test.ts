import { describe, it, expect } from "vitest";
import { toTelHref, formatPhone, validateCallNote, REVEAL_TTL_MS } from "./ApchqContactTools";
import { describeRpcError } from "./ApchqReviewSection";

describe("contact tools", () => {
  it("builds tel: E.164", () => {
    expect(toTelHref("(450) 328-6776")).toBe("tel:+14503286776");
    expect(toTelHref("123")).toBeNull();
    expect(formatPhone("+14503286776")).toBe("450-328-6776");
  });
  it("re-masks after 2 minutes", () => expect(REVEAL_TTL_MS).toBe(120000));
  it("consent never recorded without precise scope", () => {
    expect(validateCallNote("", "note assez longue", "")).toMatch(/Choisissez/);
    expect(validateCallNote("consentement_explicite_declare", "note assez longue", "oui")).toMatch(/permission/);
    expect(validateCallNote("joint", "note assez longue", "")).toBeNull();
  });
  it("distinguishes RPC errors", () => {
    expect(describeRpcError({ code: "42501", message: "forbidden" })).toMatch(/pas administrateur/);
    expect(describeRpcError({ message: "Failed to fetch" })).toMatch(/réseau/);
    expect(describeRpcError({ code: "22P02", message: "malformed array" })).toMatch(/serveur/);
  });
});
