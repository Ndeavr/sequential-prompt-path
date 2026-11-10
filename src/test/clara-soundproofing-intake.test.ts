import { describe, expect, it } from "vitest";
import {
  advanceSoundproofingIntake,
  isSoundproofingTopic,
  NO_VERIFIED_SOUNDPROOFING_PRO,
  startSoundproofingIntake,
} from "@/lib/clara/soundproofingIntake";
import { detectIntentAndLocation } from "@/services/intentLocationDetector";
import { SOUNDPROOFING_CLARA_HREF } from "@/pages/seo/PageSoundproofingPillar";

const ctaText = () => new URLSearchParams(SOUNDPROOFING_CLARA_HREF.split("?")[1]).get("q")!;

describe("Clara — isolation sonore", () => {
  it("le message du bouton de la page ouvre le parcours sonore, pas thermique", () => {
    expect(isSoundproofingTopic(ctaText())).toBe(true);
    expect(detectIntentAndLocation(ctaText()).intentKey).toBe("soundproofing");
    expect(detectIntentAndLocation("isolation sonore du plafond").intentKey).toBe("soundproofing");
    expect(detectIntentAndLocation("isolation du grenier").intentKey).toBe("insulation");
    expect(isSoundproofingTopic("isolation du grenier")).toBe(false);
  });

  it("annonce la différence sonore/thermique et pose une seule question", () => {
    const t = startSoundproofingIntake(ctaText());
    expect(t.reply).toMatch(/isolation sonore, pas d'isolation thermique/);
    expect(t.reply.match(/\?/g)).toHaveLength(1);
    expect(t.state?.step).toBe("surface");
  });

  it("retient ce qui est déjà dit et ne le redemande pas", () => {
    const t = startSoundproofingIntake("J'entends les pas du voisin d'en haut dans mon condo, insonorisation?");
    expect(t.state).toMatchObject({ surfaces: ["ceiling"], noise: ["impact"], property: "condo", step: "territory" });
  });

  it("parcourt surface → bruit → logement → secteur → accès → autorisation puis dit honnêtement qu'aucun pro vérifié n'est proposé", () => {
    let t = startSoundproofingIntake(ctaText());
    const answers = ["Le mur mitoyen", "Surtout des voix et la télé", "Un condo", "Laval", "Seulement de mon côté", "Je dois demander au syndicat"];
    const steps: string[] = [];
    for (const a of answers) {
      t = advanceSoundproofingIntake(t.state!, a);
      steps.push(t.state!.step);
    }
    expect(steps).toEqual(["noise", "property", "territory", "access", "authorization", "done"]);
    expect(t.state).toMatchObject({ territory: "Laval", access: "own_side", authorization: "needed" });
    expect(t.reply).toContain(NO_VERIFIED_SOUNDPROOFING_PRO);
    expect(t.reply).toMatch(/coupe-feu/);
    expect(t.reply).toMatch(/syndicat/);
    expect(t.reply).not.toMatch(/\d+\s?\$/);
  });

  it("quitte le parcours si la personne parle de chaleur ou de froid", () => {
    const t0 = startSoundproofingIntake(ctaText());
    const t = advanceSoundproofingIntake(t0.state!, "Non, c'est plutôt le froid et les courants d'air");
    expect(t.exited).toBe(true);
    expect(t.state).toBeNull();
    expect(t.reply).toMatch(/isolation thermique/);
  });

  it("après le résumé, toute demande de pro reçoit le même constat honnête", () => {
    let t = startSoundproofingIntake("bruits de pas du plafond dans mon duplex à Québec, insonorisation", "Québec");
    t = advanceSoundproofingIntake(t.state!, "de mon côté");
    t = advanceSoundproofingIntake(t.state!, "oui, je suis propriétaire");
    expect(t.state!.step).toBe("done");
    const after = advanceSoundproofingIntake(t.state!, "Trouvez-moi un entrepreneur");
    expect(after.reply).toBe(NO_VERIFIED_SOUNDPROOFING_PRO);
  });
});

describe("Clara — isolation sonore, sans boucle", () => {
  it("relance une seule fois puis passe à la question suivante", () => {
    const t0 = startSoundproofingIntake(ctaText());
    const t1 = advanceSoundproofingIntake(t0.state!, "je ne sais pas trop");
    expect(t1.state!.step).toBe("surface");
    const t2 = advanceSoundproofingIntake(t1.state!, "aucune idée");
    expect(t2.state!.step).toBe("noise");
    expect(t2.reply).toMatch(/voix|pas et des chocs/);
  });
});
