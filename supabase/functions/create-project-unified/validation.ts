/**
 * Validation pure (aucune dépendance runtime) du calculateur de rénovation.
 * Ce module est importé par l'Edge Function ET par les tests.
 */

export const ALLOWED_SOURCES = new Set([
  "renovation_calculator",
  "painting_calculator",
  "alex_voice",
  "alex_chat",
  "manual",
  "upload",
]);

export const ALLOWED_CATEGORIES = new Set([
  "cuisine",
  "salle_de_bain",
  "sous_sol",
  "garage",
  "aire_de_vie",
  "renovation_complete",
]);

export const ALLOWED_PROPERTY_TYPES = new Set(["maison", "condo", "plex", "autre"]);
export const ALLOWED_URGENCY = new Set(["urgent", "normal", "flexible"]);
export const ALLOWED_SCOPE = new Set(["essentiel", "standard", "haut_de_gamme"]);
export const ALLOWED_AGE = new Set([
  "recent",
  "1980_2005",
  "avant_1980",
  "inconnu",
]);
export const KNOWN_ESTIMATOR_VERSIONS = new Set(["reno-bench-2026.09"]);

/** Bornes réelles du catalogue (superficie min/max par catégorie). */
export const CATEGORY_SIZE_BOUNDS: Record<string, [number, number]> = {
  cuisine: [60, 600],
  salle_de_bain: [30, 250],
  sous_sol: [200, 2000],
  garage: [150, 1200],
  aire_de_vie: [100, 1500],
  renovation_complete: [400, 5000],
};

/** Options réellement offertes par catégorie — aucune autre valeur acceptée. */
export const CATEGORY_ADDONS: Record<string, Set<string>> = {
  cuisine: new Set([
    "armoires_sur_mesure",
    "comptoir_quartz",
    "electromenagers",
    "ilot",
    "dosseret",
    "plancher",
    "deplacement_plomberie",
  ]),
  salle_de_bain: new Set([
    "douche_ceramique",
    "bain_autoportant",
    "vanite",
    "plancher_chauffant",
    "ventilation",
    "deplacement_plomberie_sdb",
  ]),
  sous_sol: new Set([
    "isolation",
    "cloisons",
    "plafond",
    "plancher_ss",
    "salle_bain_ss",
    "fenetre_egress",
  ]),
  garage: new Set([
    "isolation_garage",
    "gypse_garage",
    "electricite_garage",
    "epoxy",
    "porte_garage",
  ]),
  aire_de_vie: new Set(["plancher_av", "eclairage", "menuiserie", "foyer", "murs_plafonds"]),
  renovation_complete: new Set([
    "structure",
    "cuisine_incluse",
    "sdb_incluse",
    "electricite_complete",
    "plomberie_complete",
    "fenetres",
    "planchers_complets",
    "cvac",
  ]),
};

/** Toutes les sous-catégories d'interface se rattachent à cette catégorie canonique. */
export const CANONICAL_MATCHING_CATEGORY = "renovation-generale";

export const MAX_BUDGET = 100_000_000;
export const MAX_PAYLOAD_BYTES = 64_000;

/** Prénom réel exigé côté serveur (2 à 80 caractères sensés). */
export function validFirstName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  if (t.length < 2 || t.length > 80) return null;
  if (!/^[\p{L}][\p{L}\p{M}'’\-. ]*$/u.test(t)) return null;
  return t;
}

/**
 * Les entrées du calculateur sont validées puis réécrites : aucun objet
 * arbitraire n'est persisté tel quel. Les entrées sont obligatoires pour le
 * calculateur de rénovation.
 */
export function validateEstimatorInputs(
  category: string,
  raw: unknown,
): { ok: true; value: Record<string, unknown> } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: false, error: "invalid_inputs" };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "invalid_inputs" };
  const o = raw as Record<string, unknown>;

  const bounds = CATEGORY_SIZE_BOUNDS[category];
  if (!bounds) return { ok: false, error: "invalid_category" };
  const size = o.sizeSqft;
  if (typeof size !== "number" || !Number.isFinite(size) || size < bounds[0] || size > bounds[1]) {
    return { ok: false, error: "invalid_size" };
  }

  const scope = typeof o.scope === "string" ? o.scope : "";
  if (!ALLOWED_SCOPE.has(scope)) return { ok: false, error: "invalid_scope" };

  const age = typeof o.age === "string" ? o.age : "inconnu";
  if (!ALLOWED_AGE.has(age)) return { ok: false, error: "invalid_age" };

  const kind = typeof o.propertyKind === "string" ? o.propertyKind : "maison";
  if (!ALLOWED_PROPERTY_TYPES.has(kind)) return { ok: false, error: "invalid_property_type" };

  const allowed = CATEGORY_ADDONS[category];
  const addonsRaw = Array.isArray(o.addons) ? o.addons : [];
  if (addonsRaw.length > 20) return { ok: false, error: "invalid_addons" };
  const addons: string[] = [];
  for (const a of addonsRaw) {
    if (typeof a !== "string" || !allowed.has(a)) return { ok: false, error: "invalid_addons" };
    if (!addons.includes(a)) addons.push(a);
  }

  return {
    ok: true,
    value: { category, sizeSqft: Math.round(size), scope, age, propertyKind: kind, addons },
  };
}

function boundedNumber(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v < 0 || v > MAX_BUDGET) return null;
  return Math.round(v);
}

/** L'estimation persistée est réduite à des champs numériques connus et bornés. */
export function validateEstimatePayload(
  raw: unknown,
): { ok: true; value: Record<string, unknown> | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "object" || Array.isArray(raw)) return { ok: false, error: "invalid_estimate" };
  const o = raw as Record<string, unknown>;
  const version = (o.benchmark as Record<string, unknown> | undefined)?.version;
  if (typeof version !== "string" || !KNOWN_ESTIMATOR_VERSIONS.has(version)) {
    return { ok: false, error: "invalid_estimator_version" };
  }

  const totalMin = boundedNumber(o.totalMin);
  const totalMax = boundedNumber(o.totalMax);
  const subtotalMin = boundedNumber(o.subtotalMin);
  const subtotalMax = boundedNumber(o.subtotalMax);
  const taxesMin = boundedNumber(o.taxesMin);
  const taxesMax = boundedNumber(o.taxesMax);
  const likely = boundedNumber(o.likely);

  if (totalMin === null || totalMax === null) return { ok: false, error: "invalid_estimate_range" };
  if (totalMax < totalMin) return { ok: false, error: "invalid_estimate_range" };
  if (subtotalMin !== null && subtotalMax !== null && subtotalMax < subtotalMin) {
    return { ok: false, error: "invalid_estimate_range" };
  }
  if (taxesMin !== null && taxesMax !== null && taxesMax < taxesMin) {
    return { ok: false, error: "invalid_estimate_range" };
  }
  if (likely !== null && (likely < totalMin || likely > totalMax)) {
    return { ok: false, error: "invalid_estimate_range" };
  }

  return {
    ok: true,
    value: {
      version,
      totalMin,
      totalMax,
      subtotalMin,
      subtotalMax,
      taxesMin,
      taxesMax,
      likely,
      confidence: typeof o.confidence === "string" ? o.confidence.slice(0, 20) : null,
      provenance: typeof o.provenance === "string" ? o.provenance.slice(0, 20) : null,
    },
  };
}

/** Normalisation d'adresse alignée sur `src/lib/addressNormalizer.ts`. */
export function normalizeAddressServer(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
