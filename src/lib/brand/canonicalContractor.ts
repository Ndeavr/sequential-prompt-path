/**
 * Canonical contractor identity + alias guard.
 * Isolation Solution Royal (ISR) is the ONLY correct rendering.
 */

export const CANONICAL_CONTRACTORS: Record<string, { name: string; short: string; website: string }> = {
  "isolation-solution-royal": {
    name: "Isolation Solution Royal",
    short: "ISR",
    website: "https://isroyal.ca",
  },
};

const BLOCKED_ALIASES = [
  "Isolation Royal",
  "Royal Isolation",
  "Isolations Royal",
];

export function normalizeContractorName(input: string | null | undefined): string {
  const raw = (input ?? "").trim();
  if (!raw) return "";
  // If it matches a blocked alias exactly (and isn't the canonical), rewrite.
  const isBlocked = BLOCKED_ALIASES.some(
    (a) => raw.toLowerCase() === a.toLowerCase(),
  );
  if (isBlocked) return "Isolation Solution Royal";
  return raw;
}

export function isBlockedContractorAlias(name: string | null | undefined): boolean {
  const raw = (name ?? "").trim().toLowerCase();
  return BLOCKED_ALIASES.some((a) => a.toLowerCase() === raw);
}

/** Runtime guard: throws if visible copy contains placeholder tokens. */
export function assertNoPlaceholderTokens(text: string): void {
  const forbidden = [
    "{nom_entreprise}",
    "contractor.company_name",
    "/Lovable",
    "Replace:",
    "Button:",
    "Remove:",
  ];
  for (const t of forbidden) {
    if (text.includes(t)) {
      throw new Error(`Public UI contains implementation placeholder: ${t}`);
    }
  }
}
