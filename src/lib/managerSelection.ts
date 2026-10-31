/** Sélection Gestionnaires (type + portes) conservée à travers connexion, retour et rafraîchissement. Aucune donnée sensible. */
export type ManagerType = "condo" | "portfolio";
export interface ManagerSelection { type: ManagerType; doors: number }

const KEY = "unpro.manager.selection.v1";

export const isValidDoors = (n: number) => Number.isInteger(n) && n >= 2 && n <= 9999;

export function parseSelection(params: URLSearchParams): ManagerSelection | null {
  const doors = Number(params.get("doors") ?? params.get("units"));
  const t = params.get("type");
  if (!isValidDoors(doors)) return null;
  return { type: t === "portfolio" ? "portfolio" : "condo", doors };
}

export function saveSelection(s: ManagerSelection) {
  try { sessionStorage.setItem(KEY, JSON.stringify(s)); localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function loadSelection(): ManagerSelection | null {
  try {
    const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    return isValidDoors(Number(v?.doors)) ? { type: v.type === "portfolio" ? "portfolio" : "condo", doors: Number(v.doors) } : null;
  } catch { return null; }
}

export function onboardingPath(s: ManagerSelection) {
  return s.type === "portfolio" ? `/gestionnaires/portefeuille?doors=${s.doors}` : `/condos/onboarding?type=condo&doors=${s.doors}`;
}
