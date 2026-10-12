import { describe, expect, it } from "vitest";
import { buildSmsGreeting, reliableFirstName, validateSmsBody } from "../../supabase/functions/_shared/smsGreeting";

describe("buildSmsGreeting", () => {
  it("A: prénom fiable (accents FR)", () => {
    expect(buildSmsGreeting({ first_name: "  hélène ", company_name: "Toitures LV" })).toEqual({ text: "Bonjour Hélène,", kind: "first_name" });
    expect(buildSmsGreeting({ first_name: "Jean-François" }).text).toBe("Bonjour Jean-François,");
  });
  it("B: entreprise si prénom absent ou invalide", () => {
    for (const fn of [null, undefined, "", "   ", "null", "undefined", "NaN", "j3an", "{{first_name}}", "<script>", "a"]) {
      expect(buildSmsGreeting({ first_name: fn, company_name: "Plomberie KZ" }).text).toBe("Bonjour à l'équipe de Plomberie KZ,");
    }
  });
  it("B: prénom marqué non fiable", () => {
    expect(buildSmsGreeting({ first_name: "Marc", first_name_reliable: false, company_name: "ÉcoRénov" }).kind).toBe("company");
  });
  it("C: générique si rien de fiable", () => {
    for (const co of [null, "", " ", "null", "undefined", "https://x.ca", "info@x.ca", "514-555-1234", "123"]) {
      expect(buildSmsGreeting({ first_name: "", company_name: co })).toEqual({ text: "Bonjour, ici UNPRO.", kind: "generic" });
    }
  });
  it("rejette les données machine", () => {
    expect(reliableFirstName("JEAN")).toBeNull();
    expect(reliableFirstName("Robert'); DROP TABLE")).toBeNull();
  });
});

describe("validateSmsBody (fail-closed)", () => {
  const bad = ["Bonjour , UNPRO…", "Bonjour  ,", "Bonjour null, test", "Bonjour undefined,", "Bonjour {{prenom}},", "Bonjour ${fname},", "à l'équipe de null", "", "   "];
  it.each(bad)("refuse %j", (b) => expect(validateSmsBody(b, { commercial: true }).ok).toBe(false));
  it("refuse affirmations inventées (commercial)", () => {
    expect(validateSmsBody("Bonjour Marc, il reste 2 places restantes.", { commercial: true }).issues).toContain("fabricated_claim");
    expect(validateSmsBody("Bonjour Marc, 2 activations cette semaine.", { commercial: true }).ok).toBe(false);
    expect(validateSmsBody("Bonjour Marc, votre score IA 42.", { commercial: true }).ok).toBe(false);
  });
  it("refuse un 'Bonjour,' commercial qui n'est pas la forme C", () => {
    expect(validateSmsBody("Bonjour, on vous écrit.", { commercial: true }).ok).toBe(false);
  });
  it("accepte les 3 formes rendues complètes", () => {
    for (const g of [buildSmsGreeting({ first_name: "Hélène" }), buildSmsGreeting({ company_name: "Plomberie KZ" }), buildSmsGreeting({})]) {
      const body = `${g.text} UNPRO aide les entrepreneurs à recevoir des rendez-vous exclusifs. Répondez STOP pour ne plus recevoir de messages.`;
      expect(validateSmsBody(body, { commercial: true })).toEqual({ ok: true, issues: [] });
    }
  });
});
