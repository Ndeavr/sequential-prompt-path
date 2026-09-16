import { describe, expect, it } from "vitest";
import {
  dedupeDetected,
  normalizeSource,
  serviceSlug,
  type DetectedService,
} from "@/hooks/useDetectedContractorServices";
import { getCompatPack } from "@/config/compatibilityPacks";

describe("normalisation des services détectés", () => {
  it("génère un slug stable sans accents ni casse", () => {
    expect(serviceSlug("Isolation d'entretoit")).toBe("isolation_d_entretoit");
    expect(serviceSlug("ISOLATION  Soufflée")).toBe("isolation_soufflee");
  });

  it("reconnaît la provenance réelle", () => {
    expect(normalizeSource("google_business")).toBe("google");
    expect(normalizeSource("firecrawl_website")).toBe("website");
    expect(normalizeSource("rbq_verified")).toBe("verified");
    expect(normalizeSource(null)).toBe("declared");
  });

  it("dédoublonne en gardant la provenance la plus forte et le statut principal", () => {
    const items: DetectedService[] = [
      { slug: "isolation_soufflee", label: "Isolation soufflée", source: "declared", is_primary: false },
      { slug: "isolation_soufflee", label: "Isolation soufflée", source: "google", is_primary: true },
      { slug: "ventilation_comble", label: "Ventilation de comble", source: "website", is_primary: false },
    ];
    const out = dedupeDetected(items);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ slug: "isolation_soufflee", source: "google", is_primary: true });
  });

  it("ignore les entrées vides plutôt que d'inventer un service", () => {
    expect(dedupeDetected([{ slug: "", label: "", source: "declared", is_primary: false }])).toHaveLength(0);
  });
});

describe("pack de services par métier", () => {
  it("n'affiche jamais l'excavation à une entreprise d'isolation", () => {
    const slugs = getCompatPack("isolation_entretoit").services.map((s) => s.slug);
    expect(slugs).toContain("isolation_entretoit");
    expect(slugs).not.toContain("excavation");
    expect(slugs).not.toContain("fondations");
    expect(slugs).not.toContain("reparation_fissures");
  });
});
