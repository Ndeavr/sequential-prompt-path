/**
 * Logique pure du « swipe » d'inspiration (accueil, sous Clara).
 * - Swipe seulement à partir de 5 réalisations réelles approuvées.
 * - Gauche = passer, droite = « J'aime / m'inspire » (session locale seulement,
 *   jamais un lead, jamais un rendez-vous).
 */
export const SWIPE_MIN_PROJECTS = 5;
export const SWIPE_THRESHOLD_PX = 90;

export type DeckMode = "empty" | "limited" | "swipe";
export function deckMode(count: number): DeckMode {
  if (count <= 0) return "empty";
  return count >= SWIPE_MIN_PROJECTS ? "swipe" : "limited";
}

export type SwipeAction = "pass" | "like" | null;
export function swipeDecision(dx: number, threshold = SWIPE_THRESHOLD_PX): SwipeAction {
  if (dx <= -threshold) return "pass";
  if (dx >= threshold) return "like";
  return null;
}

const LIKES_KEY = "unpro_inspiration_likes";
export function readLikes(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(LIKES_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
  } catch { return []; }
}
export function addLike(id: string): string[] {
  const next = [...new Set([...readLikes(), id])];
  try { sessionStorage.setItem(LIKES_KEY, JSON.stringify(next)); } catch { /* noop */ }
  return next;
}

export function inspirationSessionId(): string {
  try {
    const k = "unpro_inspiration_sid";
    let v = sessionStorage.getItem(k);
    if (!v) { v = crypto.randomUUID(); sessionStorage.setItem(k, v); }
    return v;
  } catch { return "nosession"; }
}
