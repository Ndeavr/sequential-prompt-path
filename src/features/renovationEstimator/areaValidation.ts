/**
 * UNPRO — Validation déterministe de la superficie saisie au calculateur.
 *
 * Trois états seulement, jamais d'échec silencieux :
 *  - `ok`      : dans la plage usuelle du type de projet.
 *  - `confirm` : hors plage mais réaliste → l'estimation reste possible après
 *                confirmation explicite, avec une confiance réduite affichée.
 *  - `error`   : valeur absente, nulle, négative ou physiquement invraisemblable
 *                → aucun prix n'est affiché ni enregistré.
 *
 * La bande « réaliste » est bornée à un tiers du minimum et au triple du
 * maximum du type de projet : au-delà, le prix serait trompeur.
 */

export interface AreaBounds {
  label: string;
  sizeUnit: string;
  sizeMin: number;
  sizeMax: number;
}

export type AreaValidationStatus = "ok" | "confirm" | "error";

export interface AreaValidation {
  status: AreaValidationStatus;
  /** Message bilingue affiché à l'utilisateur, null si `ok`. */
  message: string | null;
  plausibleMin: number;
  plausibleMax: number;
}

export const PLAUSIBLE_LOWER_FACTOR = 1 / 3;
export const PLAUSIBLE_UPPER_FACTOR = 3;

export function validateArea(def: AreaBounds, value: number | null | undefined): AreaValidation {
  const plausibleMin = Math.max(1, Math.floor(def.sizeMin * PLAUSIBLE_LOWER_FACTOR));
  const plausibleMax = Math.ceil(def.sizeMax * PLAUSIBLE_UPPER_FACTOR);
  const base = { plausibleMin, plausibleMax };

  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return {
      ...base,
      status: "error",
      message: `Indiquez une superficie en ${def.sizeUnit} (${def.sizeMin} à ${def.sizeMax}). · Enter an area in ${def.sizeUnit} (${def.sizeMin}–${def.sizeMax}).`,
    };
  }

  if (value < plausibleMin || value > plausibleMax) {
    return {
      ...base,
      status: "error",
      message: `Superficie invraisemblable pour « ${def.label} » : indiquez une valeur entre ${plausibleMin} et ${plausibleMax} ${def.sizeUnit}. · Implausible area for "${def.label}": enter between ${plausibleMin} and ${plausibleMax} ${def.sizeUnit}.`,
    };
  }

  if (value < def.sizeMin || value > def.sizeMax) {
    return {
      ...base,
      status: "confirm",
      message: `${value} ${def.sizeUnit} sort de la plage habituelle pour « ${def.label} » (${def.sizeMin} à ${def.sizeMax} ${def.sizeUnit}). Confirmez cette superficie pour continuer : l'estimation sera moins précise. · This area is outside the usual range; confirm to continue with a lower-confidence estimate.`,
    };
  }

  return { ...base, status: "ok", message: null };
}
