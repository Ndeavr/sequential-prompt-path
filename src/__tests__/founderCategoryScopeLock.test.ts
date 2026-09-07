/**
 * Verrou de portée serveur — offre fondateur « Services résidentiels uniquement ».
 *
 * L'UI ne propose que les catégories `group_type = 'local_service'`. Ce test
 * démontre que l'API publique applique la MÊME règle : un appel RPC direct avec
 * un slug professionnel (courtier, notaire, inspecteur, évaluateur, arpenteur)
 * est refusé avec `category_not_eligible`, alors qu'un slug de service
 * résidentiel actif reste admissible.
 *
 * Lecture seule : `check_founder_eligibility` est STABLE, aucune inscription
 * n'est créée, aucun courriel/SMS/paiement n'est déclenché.
 */
import { describe, it, expect } from "vitest";

const URL = process.env.VITE_SUPABASE_URL ?? "https://clmaqdnphbndvmmqvpff.supabase.co";
const KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsbWFxZG5waGJuZHZtbXF2cGZmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNTk1NTUsImV4cCI6MjA4ODczNTU1NX0.uqNcgZ8JDldQJ8uDEimstyES8RO8O2ybRJYTcI_KBOk";

const PROFESSIONAL_SLUGS = [
  "agent-courtier-immobilier",
  "arpenteur-geometre",
  "courtier-hypothecaire",
  "evaluateur-immobilier",
  "inspecteur-batiment",
  "notaire",
];

async function checkEligibility(city: string, slug: string) {
  const res = await fetch(`${URL}/rest/v1/rpc/check_founder_eligibility`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: KEY, Authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ p_city: city, p_category_slug: slug }),
  });
  expect(res.status).toBe(200);
  return (await res.json()) as { eligible: boolean; reason: string | null };
}

describe("verrou de portée serveur de l'offre fondateur", () => {
  it("accepte un service résidentiel actif", async () => {
    const out = await checkEligibility("Laval", "lavage-de-vitres");
    expect(out.reason).not.toBe("category_not_eligible");
    expect(out.eligible).toBe(true);
  }, 20000);

  it.each(PROFESSIONAL_SLUGS)("refuse le slug professionnel %s", async (slug) => {
    const out = await checkEligibility("Laval", slug);
    expect(out.eligible).toBe(false);
    expect(out.reason).toBe("category_not_eligible");
  }, 20000);

  it("refuse un slug inconnu", async () => {
    const out = await checkEligibility("Laval", "slug-inexistant-zzz");
    expect(out.eligible).toBe(false);
    expect(out.reason).toBe("category_not_eligible");
  }, 20000);
});
