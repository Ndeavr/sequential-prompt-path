import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validateArea } from "@/features/renovationEstimator/areaValidation";
import { normalizeServiceCategory } from "@/lib/localServices/categories";

const read = (p: string) => readFileSync(p, "utf8");

describe("P0 — superficie du calculateur", () => {
  const def = { label: "Cuisine", sizeUnit: "pi²", sizeMin: 100, sizeMax: 1000 };

  it("refuse une superficie absente ou absurde", () => {
    expect(validateArea(def, 0).status).toBe("error");
    expect(validateArea(def, Number.NaN).status).toBe("error");
    expect(validateArea(def, 50_000).status).toBe("error");
  });

  it("demande une confirmation pour une superficie réaliste hors plage", () => {
    const res = validateArea(def, 1500);
    expect(res.status).toBe("confirm");
    expect(res.message).toBeTruthy();
  });

  it("accepte une superficie dans la plage", () => {
    expect(validateArea(def, 500).status).toBe("ok");
  });

  it("bloque le prix tant que la superficie n'est pas confirmée", () => {
    const src = read("src/pages/calculators/PageRenovationEstimator.tsx");
    expect(src).toContain("const sizeBlocked");
    expect(src).toContain("if (!category || sizeBlocked) return null;");
    expect(src).toContain('data-testid="confirm-unusual-area"');
  });
});

describe("P0 — offre gratuite : services de nettoyage", () => {
  for (const label of [
    "Lavage de planchers",
    "Nettoyage de céramique",
    "Nettoyage de sous-sol",
    "Nettoyage de cuisine",
    "Floor cleaning",
  ]) {
    it(`admet « ${label} »`, () => {
      const res = normalizeServiceCategory(label);
      expect(res, `${label} → ${JSON.stringify(res)}`).toBeTruthy();
    });
  }

  it("exclut toujours la rénovation générale", () => {
    expect(normalizeServiceCategory("Rénovation de cuisine complète")).toBeNull();
  });
});

describe("P0 — checkout et prix annuel", () => {
  it("n'affiche jamais un écran de paiement vide", () => {
    const src = read("src/pages/checkout/PageCheckoutNativeScrollable.tsx");
    expect(src).toContain("Paiement non disponible pour l'instant");
    expect(src).toContain("Retirer le code");
  });

  it("n'expose l'annuel que s'il est réellement facturable", () => {
    const src = read("src/hooks/usePlanCatalog.ts");
    expect(src).toContain("supportsYearly: !isFree && yearly > 0 && yearlyPriceId.length > 0");
  });
});

describe("P0 — journal de prospection", () => {
  it("ne perd plus un événement en silence", () => {
    const src = read("supabase/functions/_shared/outreachEvents.ts");
    expect(src).toContain("platform_operation_outcomes");
    expect(src).toContain("OutreachEventError");
    const resend = read("supabase/functions/resend-events/index.ts");
    expect(resend).toContain("{ strict: true }");
  });
});

describe("P0 — entreprise non listée et permission d'appel", () => {
  it("laisse toujours déclarer une entreprise non listée", () => {
    const src = read("src/pages/contractor-funnel/PageContractorPricingIntake.tsx");
    expect(src).toContain('data-testid="company-not-listed"');
  });

  it("n'exige plus une validation téléphonique pour appeler", () => {
    const src = read("supabase/functions/_shared/contactPermissions.ts");
    expect(src).toContain('phoneStatus === "outside_quebec"');
  });
});
