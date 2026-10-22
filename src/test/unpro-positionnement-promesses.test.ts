import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { entrepreneurMessaging, resolveHeroVariant } from "@/lib/copy/entrepreneurs";
import { OFFER_350 } from "@/lib/copy/offer350";

const read = (path: string) => readFileSync(path, "utf8");

describe("UNPRO — promesses cohérentes", () => {
  it("positionne les entrepreneurs sur les rendez-vous réellement exclusifs", () => {
    const hero = resolveHeroVariant();
    expect(hero.title).toContain("rendez-vous");
    expect(hero.subtitle).toContain("qualifiés");
    expect(hero.subtitle).toContain("territoire");
    expect(hero.subtitle).toContain("jamais partagé");
    expect(entrepreneurMessaging.hero.promise).not.toMatch(/garantis/i);
  });

  it("ne confond pas les rendez-vous optionnels avec l'activation de base", () => {
    expect(OFFER_350.price_cents).toBe(35000);
    expect(OFFER_350.duration_months).toBe(12);
    expect(OFFER_350.max_appointments).toBe(0);
  });

  it("exprime le bénéfice propriétaire sans inventer de rendez-vous", () => {
    const hero = read("src/components/home-light/HeroHomeownerLight.tsx");
    expect(hero).toContain("pour votre situation");
    expect(hero).toContain("sans multiplier les soumissions");
    expect(hero).not.toContain("rendez-vous garantis");
  });

  it("présente les moteurs externes comme un potentiel, pas comme une certification", () => {
    const landing = read("src/pages/marketing/PageVisibiliteIA.tsx");
    const contractorHero = read("src/components/entrepreneur-landing/v2/HeroV2.tsx");
    expect(landing).toContain("Augmentez vos chances d’être recommandé");
    expect(contractorHero).toContain("Améliorez vos chances d’être recommandé");
    expect(contractorHero).not.toContain("> Recommandé par l'IA</span>");
    expect(contractorHero).not.toContain("Exclusivité territoriale");
  });
});
