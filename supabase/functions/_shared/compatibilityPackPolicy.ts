/** Server-owned pack selection; questionnaire answers never establish a trade. */
export const ALLOWED_COMPATIBILITY_PACKS = ["excavation_fondation", "isolation_entretoit"] as const;
export function resolveCompatibilityPack(stored: unknown, specialty: unknown, services: string[] = []): string {
  if (typeof stored === "string" && ALLOWED_COMPATIBILITY_PACKS.some(p => p === stored)) return stored;
  const terms = [specialty, ...services].filter(v => typeof v === "string").join(" ").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  return /\b(isolation|insulation|entretoit|isolant|attic)\b/.test(terms.replace(/[_-]/g, " ")) ? "isolation_entretoit" : "excavation_fondation";
}
export function validateCompatibilityPack(requested: unknown, stored: unknown, specialty: unknown, services: string[], admin: boolean): string {
  const resolved = resolveCompatibilityPack(stored, specialty, services);
  if (requested == null) return resolved;
  if (typeof requested !== "string" || !ALLOWED_COMPATIBILITY_PACKS.some(p => p === requested)) throw new Error("invalid_trade_pack");
  if (!admin && requested !== resolved) throw new Error("trade_pack_not_authorized");
  return requested;
}