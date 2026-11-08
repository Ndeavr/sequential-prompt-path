import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ADDRESS_FIELD_MASK, bookingTerritoryDecision, carryGeocodedCenters, effectiveTerritoryRules, geocodePendingRules, haversineKm, needsAddressDetail, pickAddressHit, pickAddressPoint, placesToHits, propertyPoint, territoryVerdict, type StoredTerritoryRule } from "../../supabase/functions/_shared/territoryRules";
import { projectSizeFit, readDeclaredSizes } from "../../supabase/functions/_shared/projectSizeFit";

const LAVAL = { lat: 45.5697, lng: -73.692 };
const radius = (o: Partial<StoredTerritoryRule> = {}): StoredTerritoryRule => ({ kind: "radius", include: true, place: "Laval", radius_km: 30, geocode_status: "geocoded", center: { ...LAVAL, source: "google_places" }, ...o });

describe("territoires déclarés : exclusion prioritaire, rien d'inventé", () => {
  // Adresses synthétiques à l'est du centre de Laval, rayon de 30 km.
  // 1° de longitude ≈ 78 km à 45,57° N → 29,8 km et 30,3 km.
  const at = (dLng: number) => ({ lat: LAVAL.lat, lng: LAVAL.lng + dLng, accuracy: "geocoded_address" as const });
  const inside = at(29.8 / 78.0), outside = at(30.3 / 78.0);
  it("frontière du rayon : adresse à 29,8 km couverte, à 30,3 km non", () => {
    expect(haversineKm(LAVAL, inside)).toBeLessThan(30);
    expect(haversineKm(LAVAL, outside)).toBeGreaterThan(30);
    const r = territoryVerdict([radius()], { city: "Terrebonne", point: inside });
    expect(r.verdict).toBe("covered");
    expect(r.reason).toMatch(/km du centre déclaré \(rayon de 30 km, à vol d'oiseau\)/);
    expect(territoryVerdict([radius()], { city: "Terrebonne", point: outside }).verdict).toBe("unknown");
  });
  it("centre de ville jamais accepté comme adresse : sans coordonnées d'adresse, rien n'est couvert", () => {
    expect(territoryVerdict([radius()], { city: "Montréal" }).verdict).toBe("unknown");
    // @ts-expect-error — une précision « city_centroid » est refusée
    expect(territoryVerdict([radius()], { city: "Montréal", point: { lat: 45.5019, lng: -73.5674, accuracy: "city_centroid" } }).verdict).toBe("unknown");
  });
  it("exclusions prioritaires : ville, quartier, puis rayon exclu", () => {
    const loc = { city: "Montréal", neighborhood: "Plateau-Mont-Royal", point: { lat: 45.522, lng: -73.581, accuracy: "property_coordinates" as const } };
    const wide = radius({ radius_km: 80 });
    expect(territoryVerdict([wide, { kind: "locality", include: false, place: "Montréal" }], loc).verdict).toBe("excluded");
    expect(territoryVerdict([wide, { kind: "locality", include: false, place: "Plateau Mont-Royal" }], loc).verdict).toBe("excluded");
    expect(territoryVerdict([wide, { kind: "locality", include: false, place: "Verdun" }], loc).verdict).toBe("covered");
    const exclRadius = radius({ include: false, place: "Laval", radius_km: 15 });
    expect(territoryVerdict([wide, exclRadius], { city: "Laval", point: at(0.05) }).verdict).toBe("excluded");
  });
  it("rayon exclu impossible à vérifier sans adresse précise : jamais desservi", () => {
    const r = territoryVerdict([{ kind: "locality", include: true, place: "Terrebonne" }, radius({ include: false, radius_km: 15 })], { city: "Terrebonne" });
    expect(r).toMatchObject({ verdict: "unknown", exclusionUncertain: true });
  });
  it("adresse géocodée : un seul résultat de niveau adresse, sinon aucune coordonnée", () => {
    expect(pickAddressPoint([{ lat: 1, lng: 2, types: ["street_address"] }])).toEqual({ lat: 1, lng: 2, accuracy: "geocoded_address" });
    expect(pickAddressPoint([{ lat: 1, lng: 2, types: ["locality", "political"] }])).toBeNull();
    expect(pickAddressPoint([{ lat: 1, lng: 2, types: ["premise"] }, { lat: 3, lng: 4, types: ["street_address"] }])).toBeNull();
    expect(propertyPoint({ latitude: null, longitude: null })).toBeNull();
    expect(propertyPoint({ latitude: "45.5", longitude: "-73.6" })).toEqual({ lat: 45.5, lng: -73.6, accuracy: "property_coordinates" });
  });
  it("réservation : mêmes règles que le jumelage", () => {
    const rules = [radius(), { kind: "locality", include: false, place: "Montréal" } as StoredTerritoryRule];
    expect(bookingTerritoryDecision(rules, [], { city: "Montréal", point: at(0.01) })).toMatchObject({ allowed: false, code: "territory_excluded" });
    // Adresse géocodée exacte : hiérarchie connue (municipalité + quartier).
    const areas = ["Terrebonne", "Lachenaie"];
    expect(bookingTerritoryDecision(rules, [], { city: "Terrebonne", point: inside, areas })).toMatchObject({ allowed: true });
    expect(bookingTerritoryDecision(rules, [], { city: "Terrebonne", point: outside, areas })).toMatchObject({ allowed: false, code: "outside_declared_territory" });
    // Même adresse sans hiérarchie : « Montréal » exclu pourrait être… inconnu → jamais admis en silence.
    expect(bookingTerritoryDecision(rules, [], { city: "Terrebonne", point: inside })).toMatchObject({ allowed: false, code: "territory_unverified" });
    expect(bookingTerritoryDecision(rules, [], { city: "Terrebonne" })).toMatchObject({ allowed: false });
    expect(bookingTerritoryDecision([], ["Laval"], { city: "Laval" })).toMatchObject({ allowed: true });
    expect(bookingTerritoryDecision([], [], { city: "Gatineau" })).toMatchObject({ allowed: true, reason: "Aucun territoire déclaré" });
  });
  it("inclusions non confirmées ignorées, exclusions toujours appliquées", () => {
    const answers = { territory_rules: [radius(), { kind: "locality", include: false, place: "Montréal" }] };
    expect(effectiveTerritoryRules(answers).map((r) => r.include)).toEqual([false]);
    expect(effectiveTerritoryRules({ ...answers, preferences_confirmed: true })).toHaveLength(2);
  });
  it("sans coordonnées, centre ambigu ou temps de route : aucune couverture présumée", () => {
    expect(territoryVerdict([radius({ geocode_status: "ambiguous" })], { city: "Montréal", point: at(0.01) }).verdict).toBe("unknown");
    expect(territoryVerdict([{ kind: "travel_time", include: true, place: "Laval", travel_minutes: 45 }], { city: "Terrebonne", point: inside }).verdict).toBe("unknown");
  });
  it("géocodage : un seul résultat-localité = géocodé; plusieurs = ambigu; panne = indisponible", async () => {
    const one = await geocodePendingRules([radius({ geocode_status: "pending", center: undefined })], async () => [{ ...LAVAL, types: ["locality"], province: "QC" }]);
    expect(one[0].geocode_status).toBe("geocoded");
    const two = await geocodePendingRules([radius({ geocode_status: "pending", center: undefined })], async () => [{ ...LAVAL, types: ["locality"] }, { lat: 1, lng: 1, types: ["locality"] }]);
    expect(two[0].geocode_status).toBe("ambiguous");
    const down = await geocodePendingRules([radius({ geocode_status: "pending", center: undefined })], async () => null);
    expect(down[0].geocode_status).toBe("unavailable");
    expect(down[0].center).toBeUndefined();
  });
  it("centre déjà géocodé réutilisé à la sauvegarde suivante", () => {
    const out = carryGeocodedCenters([radius({ geocode_status: "pending", center: undefined })], [radius()]);
    expect(out[0].center?.lat).toBe(LAVAL.lat);
  });
  it("distance Laval–Montréal (centres) ≈ 12 km", () => expect(Math.round(haversineKm(LAVAL, { lat: 45.5019, lng: -73.5674 }))).toBe(12));
  it("le jumelage consomme ces règles et les tailles déclarées", () => {
    const src = readFileSync("supabase/functions/match-lead/index.ts", "utf8");
    expect(src).toContain("territoryVerdict(");
    expect(src).toContain('territory.verdict === "excluded"');
    expect(src).toContain("projectSizeFit(");
    expect(src).toContain("territoryVerdict(territoryByContractor.get(String(c.id)) ?? [], leadLocation)");
    expect(src).toContain("!territory.exclusionUncertain &&");
    expect(src).not.toMatch(/lat: leadPoint/);
    const booking = readFileSync("supabase/functions/booking-confirm-slot/index.ts", "utf8");
    expect(booking.indexOf("bookingTerritoryDecision(")).toBeGreaterThan(0);
    expect(booking.indexOf("bookingTerritoryDecision(")).toBeLessThan(booking.indexOf('rpc("confirm_smart_booking_slot"'));
  });
});

describe("tailles de projet déclarées dans le jumelage", () => {
  const sizes = [
    { code: "small", stance: "refused" as const, minValue: 0, maxValue: 5000 },
    { code: "medium", stance: "accepted" as const, minValue: 5000, maxValue: 25000 },
    { code: "large", stance: "preferred" as const, minValue: 25000, maxValue: null },
  ];
  it("budget entièrement dans une taille refusée : exclu", () => expect(projectSizeFit(sizes, { min: 1000, max: 3000 }).fit).toBe("refused"));
  it("budget qui recoupe une taille acceptée : jamais exclu", () => expect(projectSizeFit(sizes, { min: 3000, max: 8000 }).fit).toBe("neutral"));
  it("taille recherchée : bonus", () => expect(projectSizeFit(sizes, { max: 40000 }).fit).toBe("preferred"));
  it("lit seulement la répartition déclarée du devis", () => {
    expect(readDeclaredSizes({ project_size_mix: { provenance: "declared", sizes } })).toHaveLength(3);
    expect(readDeclaredSizes({ project_size_mix: { provenance: "inferred", sizes } })).toHaveLength(0);
    expect(readDeclaredSizes({ sizes })).toHaveLength(0);
  });
  it("aucune fourchette déclarée ou budget inconnu : neutre (aucune fourchette universelle)", () => {
    expect(projectSizeFit([{ code: "small", stance: "refused" }], { max: 1000 }).fit).toBe("neutral");
    expect(projectSizeFit(sizes, {}).fit).toBe("neutral");
  });
  it("tailles déclarées copiées au profil canonique et lues avant le devis", () => {
    const quote = readFileSync("supabase/functions/compute-pricing-quote/index.ts", "utf8");
    expect(quote).toMatch(/from\("contractor_matching_profiles"\)[\s\S]{0,200}eq\("contractor_id", resolvedContractorId\)/);
    expect(quote).toContain("source_quote_id: saved.id");
    expect(quote).toContain("size_mix_persisted: sizeMixPersisted");
    const match = readFileSync("supabase/functions/match-lead/index.ts", "utf8");
    expect(match.indexOf("readDeclaredSizes(p.answers)")).toBeGreaterThan(0);
    expect(match.indexOf("readDeclaredSizes(p.answers)")).toBeLessThan(match.indexOf("readDeclaredSizes(q.input_payload)"));
    expect(readDeclaredSizes({ project_size_mix: { provenance: "declared", sizes: [{ key: "small", minValue: 1000, maxValue: 5000 }] } })).toHaveLength(1);
    expect(readDeclaredSizes({ project_size_mix: { provenance: "hypothesis", sizes: [{ key: "small" }] } })).toHaveLength(0);
  });
});

describe("quartiers exclus appliqués à l'ADRESSE (réservation et jumelage)", () => {
  // Réponse Places (New) synthétique, forme réelle : addressComponents longText/shortText/types.
  const placesResponse = (components: { longText: string; shortText?: string; types: string[] }[] | undefined, types = ["street_address"]) => [{
    id: "synthetic-place", location: { latitude: 45.5432, longitude: -73.5921 }, types,
    ...(components ? { addressComponents: components } : {}),
  }];
  const rosemont = [
    { longText: "1234", types: ["street_number"] },
    { longText: "Rue Synthétique", types: ["route"] },
    { longText: "Rosemont–La Petite-Patrie", types: ["sublocality_level_1", "sublocality", "political"] },
    { longText: "Montréal", shortText: "Montréal", types: ["locality", "political"] },
    { longText: "Québec", shortText: "QC", types: ["administrative_area_level_1", "political"] },
  ];
  const excludeRosemont: StoredTerritoryRule[] = [
    { kind: "locality", include: true, place: "Montréal" },
    { kind: "locality", include: false, place: "Rosemont–La Petite-Patrie" },
  ];

  it("le masque demande la hiérarchie de l'adresse", () => {
    expect(ADDRESS_FIELD_MASK).toContain("places.addressComponents");
    for (const f of ["booking-confirm-slot", "match-lead"]) {
      const src = readFileSync(`supabase/functions/${f}/index.ts`, "utf8");
      expect(src).toContain("ADDRESS_FIELD_MASK");
      expect(src).toContain("needsAddressDetail(");
      expect(src).toContain("pickAddressHit(placesToHits(res.places))");
    }
  });

  it("adresse géocodée dans le quartier exclu : refusée (réservation) et exclue (jumelage)", () => {
    const hit = pickAddressHit(placesToHits(placesResponse(rosemont)));
    expect(hit?.areas).toEqual(expect.arrayContaining(["Rosemont–La Petite-Patrie", "Montréal"]));
    const loc = { city: "Montréal", point: hit!.point, areas: hit!.areas };
    expect(territoryVerdict(excludeRosemont, loc).verdict).toBe("excluded");
    expect(bookingTerritoryDecision(excludeRosemont, [], loc)).toMatchObject({ allowed: false, code: "territory_excluded" });
  });

  it("adresse géocodée dans un autre quartier : admise par la localité déclarée", () => {
    const other = rosemont.map((c) => c.types.includes("sublocality") ? { ...c, longText: "Verdun" } : c);
    const hit = pickAddressHit(placesToHits(placesResponse(other)))!;
    expect(bookingTerritoryDecision(excludeRosemont, [], { city: "Montréal", point: hit.point, areas: hit.areas })).toMatchObject({ allowed: true });
  });

  it("précision manquante (ville seule, aucun composant, résultat non-adresse) : jamais admise en silence", () => {
    expect(bookingTerritoryDecision(excludeRosemont, [], { city: "Montréal" })).toMatchObject({ allowed: false, code: "territory_unverified" });
    const noComponents = pickAddressHit(placesToHits(placesResponse(undefined)))!;
    expect(noComponents.areas).toBeNull();
    expect(bookingTerritoryDecision(excludeRosemont, [], { city: "Montréal", point: noComponents.point, areas: noComponents.areas })).toMatchObject({ allowed: false, code: "territory_unverified" });
    expect(pickAddressHit(placesToHits(placesResponse(rosemont, ["locality", "political"])))).toBeNull();
  });

  it("fiche propriété avec quartier : exclusion appliquée sans géocodage", () => {
    const loc = { city: "Montréal", neighborhood: "Rosemont–La Petite-Patrie", point: { lat: 45.54, lng: -73.59, accuracy: "property_coordinates" as const } };
    expect(needsAddressDetail(excludeRosemont, loc)).toBe(false);
    expect(territoryVerdict(excludeRosemont, loc).verdict).toBe("excluded");
    expect(needsAddressDetail(excludeRosemont, { city: "Montréal" })).toBe(true);
  });
});
