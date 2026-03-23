/**
 * Grant Linking Service
 * Detects government program mentions in text and provides enrichment data.
 */

export interface GrantProgram {
  name: string;
  officialUrl: string;
  unproRoute: string;
  description: string;
}

export interface EnrichedSegment {
  type: "text" | "grant";
  content: string;
  grant?: GrantProgram;
}

const GRANT_PROGRAMS: GrantProgram[] = [
  {
    name: "Rénoclimat",
    officialUrl: "https://transitionenergetique.gouv.qc.ca/residentiel/programmes/renoclimat",
    unproRoute: "/alex",
    description: "Aide financière pour améliorer l'efficacité énergétique de votre maison (isolation, portes, fenêtres).",
  },
  {
    name: "LogisVert",
    officialUrl: "https://transitionenergetique.gouv.qc.ca/residentiel/programmes/logisvert",
    unproRoute: "/alex",
    description: "Programme d'aide pour la conversion de systèmes de chauffage et l'efficacité énergétique.",
  },
  {
    name: "Canada Greener Homes",
    officialUrl: "https://natural-resources.canada.ca/energy-efficiency/homes/canada-greener-homes-initiative/24831",
    unproRoute: "/alex",
    description: "Subvention fédérale pour les rénovations écoénergétiques résidentielles.",
  },
  {
    name: "Chauffez vert",
    officialUrl: "https://transitionenergetique.gouv.qc.ca/residentiel/programmes/chauffez-vert",
    unproRoute: "/alex",
    description: "Aide pour remplacer un système de chauffage au mazout ou au propane.",
  },
  {
    name: "Novoclimat",
    officialUrl: "https://transitionenergetique.gouv.qc.ca/residentiel/programmes/novoclimat",
    unproRoute: "/alex",
    description: "Programme pour les maisons neuves certifiées haute performance énergétique.",
  },
  {
    name: "SCHL",
    officialUrl: "https://www.cmhc-schl.gc.ca/consumers/home-buying/mortgage-loan-insurance/mortgage-loan-insurance-702",
    unproRoute: "/alex",
    description: "Remboursement partiel de prime SCHL pour les maisons écoénergétiques.",
  },
];

/**
 * Build a case-insensitive regex that matches any known program name.
 */
function buildGrantRegex(): RegExp {
  const escaped = GRANT_PROGRAMS.map((g) =>
    g.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );
  return new RegExp(`(${escaped.join("|")})`, "gi");
}

/**
 * Detect grant program mentions in a text string and return enriched segments.
 */
export function enrichTextWithGrantLinks(text: string): EnrichedSegment[] {
  const regex = buildGrantRegex();
  const segments: EnrichedSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    const program = GRANT_PROGRAMS.find(
      (g) => g.name.toLowerCase() === match![0].toLowerCase()
    );
    segments.push({ type: "grant", content: match[0], grant: program });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", content: text.slice(lastIndex) });
  }

  return segments;
}

/**
 * Extract unique grant programs mentioned in a text.
 */
export function detectGrants(text: string): GrantProgram[] {
  const regex = buildGrantRegex();
  const found = new Map<string, GrantProgram>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const program = GRANT_PROGRAMS.find(
      (g) => g.name.toLowerCase() === match![0].toLowerCase()
    );
    if (program && !found.has(program.name)) {
      found.set(program.name, program);
    }
  }

  return Array.from(found.values());
}
