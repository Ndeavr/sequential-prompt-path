/**
 * UNPRO Radar — pure classification + planning for Scout captures.
 * No Deno/browser APIs: shared by scout-ingest, vitest and (mirrored) the extension.
 *
 * Invariants:
 *  - Never invents a company, link or contact. A declared affiliation is an
 *    `inferred` link only; it becomes `verified` solely by an admin with a source.
 *  - "Employé chez X" never means "propriétaire de X"; an employer's RBQ is never
 *    attributed to the person (links carry no licence field at all).
 *  - Nothing here sends, schedules or queues any message.
 */

export type SignalType = "contractor_offer" | "homeowner_request" | "uncertain";
export type AffiliationRelation = "employee_declared" | "owner_declared" | "mentioned";
export type LinkStatus = "inferred" | "pending" | "verified" | "rejected";

export interface Classification {
  signal_type: SignalType;
  contractor_score: number;
  homeowner_score: number;
  evidence: string[];
}

export interface Affiliation {
  company_name: string;
  relation: AffiliationRelation;
  evidence: string;
}

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'").replace(/\s+/g, " ").trim();

const CONTRACTOR_PHRASES: Array<[RegExp, number, string]> = [
  [/\bje cherche (des |de nouveaux )?contrats\b/, 55, "je cherche des contrats"],
  [/\bcherche (des )?contrats\b/, 50, "cherche des contrats"],
  [/\b(nous sommes|on est|je suis) specialises?\b/, 45, "nous sommes spécialisés"],
  [/\b(je suis|nous sommes|on est) disponibles?\b/, 45, "je suis disponible"],
  [/\b(pv|pm|mp) moi\b/, 35, "PV moi"],
  [/\b(ecris|ecrivez|texte|textez|appelle|appelez)[- ]moi\b/, 30, "écris-moi"],
  [/\bcontactez[- ]moi\b/, 20, "contactez-moi"],
  [/\bsous[- ]traitance\b/, 40, "sous-traitance"],
  [/\bpartenariat\b/, 35, "partenariat"],
  [/\bsoumission gratuite\b/, 20, "soumission gratuite"],
  [/\ben prive\b/, 10, "en privé"],
];

const HOMEOWNER_PHRASES: Array<[RegExp, number, string]> = [
  [/\bje cherche (un|une|quelqu'un)\b/, 45, "je cherche un"],
  [/\b(besoin d'un|besoin d'une|j'ai besoin)\b/, 40, "besoin d'un"],
  [/\b(quelqu'un|qqn|qq1) (connait|conna[iî]t|aurait|peut)\b/, 40, "quelqu'un connaît"],
  [/\brecommand(ation|ez|er)\b/, 35, "recommandation"],
  [/\bcombien (ca )?(coute|couterait|charge)\b/, 30, "combien coûte"],
  [/\b(qui (est|serait) disponible|(etes|es)[- ]vous disponibles?|est-ce que .* disponible)\b/, 45, "question disponibilité"],
  [/\bma (maison|toiture|cuisine|salle de bain|fondation)\b/, 20, "ma maison"],
];

/** A bare availability reply ("Disponible", "Dispo !", "Moi") from a commenter. */
const BARE_AVAILABILITY = /^(moi|moi aussi|dispo|disponible|disponibles|toujours disponible|disponible ici)\s*[!.]*$/;

export function classifySignal(text: string, postContext?: string | null): Classification {
  const t = norm(text ?? "");
  const evidence: string[] = [];
  let c = 0;
  let h = 0;
  const isQuestion = /\?/.test(text ?? "");

  for (const [re, w, label] of CONTRACTOR_PHRASES) if (re.test(t)) { c += w; evidence.push(label); }
  for (const [re, w, label] of HOMEOWNER_PHRASES) if (re.test(t)) { h += w; evidence.push(label); }

  const stripped = t.replace(/^[^:]{1,60}:\s*/, ""); // "Yannick Levert : Disponible"
  if (BARE_AVAILABILITY.test(stripped)) { c += 40; evidence.push("disponible (réponse)"); }
  else if (/\bdispo(nible)?s?\b/.test(t) && !isQuestion && h === 0) { c += 25; evidence.push("disponible"); }

  // Thread context: a homeowner post asking for a trade makes short replies contractor offers.
  if (postContext) {
    const p = norm(postContext);
    const postIsRequest = HOMEOWNER_PHRASES.some(([re]) => re.test(p)) || /\?/.test(postContext);
    if (postIsRequest && c > 0 && h === 0) { c += 15; evidence.push("réponse à une demande"); }
  }

  let signal_type: SignalType = "uncertain";
  if (h > 0 && c === 0) signal_type = "homeowner_request";
  else if (c > 0 && h === 0) signal_type = isQuestion && c < 40 ? "uncertain" : "contractor_offer";
  else if (c > 0 && h > 0) signal_type = c >= h + 20 ? "contractor_offer" : "uncertain";

  return { signal_type, contractor_score: Math.min(100, c), homeowner_score: Math.min(100, h), evidence };
}

const AFFIL_RE =
  /\b(employ[eé]e?s? (?:chez|pour)|je travaille (?:chez|pour)|on travaille (?:chez|pour)|travaille (?:chez|pour)|propri[eé]taire (?:de|d')|mon entreprise|ma compagnie|j'ai fond[eé])\s*:?\s*([^.!?\n;()]{2,160})/gi;

/** Extract declared affiliations. "chez A et B" yields two links; never upgrades employee to owner. */
export function extractAffiliations(text: string): Affiliation[] {
  const out: Affiliation[] = [];
  const seen = new Set<string>();
  AFFIL_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = AFFIL_RE.exec(text ?? "")) !== null) {
    const verb = norm(m[1]);
    const relation: AffiliationRelation = /propri|mon entreprise|ma compagnie|fond/.test(verb)
      ? "owner_declared"
      : "employee_declared";
    for (const part of m[2].split(/\s*(?:,|\bet\b|&|\/)\s*/i)) {
      const name = part.replace(/\s+(depuis|a|à|sur|dans|en)\s.*$/i, "").trim().replace(/[\s\-–—:]+$/, "");
      if (name.length < 3 || name.length > 120) continue;
      const key = norm(name);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ company_name: name, relation, evidence: m[0].trim().slice(0, 240) });
    }
  }
  return out;
}

/** Stable FNV-1a fingerprint of source + author + exact comment (normalised). */
export function captureFingerprint(input: { source_url?: string | null; post_url?: string | null; author_name?: string | null; raw_text?: string | null }): string {
  const src = norm(String(input.post_url || input.source_url || "")).replace(/^https?:\/\/(www\.|m\.)?/, "").replace(/[?#].*$/, "");
  const s = [src, norm(String(input.author_name ?? "")), norm(String(input.raw_text ?? ""))].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return `scv1_${h.toString(16).padStart(8, "0")}_${s.length}`;
}

/** Manual search links only — no automated scraping, no paid lookups. */
export function buildSearchLinks(q: { company_name?: string | null; person_name?: string | null; city?: string | null }) {
  const term = [q.company_name ?? q.person_name, q.city].filter(Boolean).join(" ").trim();
  if (!term) return [];
  const e = encodeURIComponent(term);
  return [
    { label: "Recherche web", url: `https://www.google.com/search?q=${e}` },
    { label: "Registre RBQ", url: "https://www.pes.rbq.gouv.qc.ca/RegistreLicences/Recherche" },
    { label: "Registre des entreprises (REQ)", url: "https://www.registreentreprises.gouv.qc.ca/RQAnonymeGR/GR/GR03/GR03A2_19A_PIU_RechEnt_PC/PageRechSimple.aspx" },
    { label: "Page Facebook", url: `https://www.facebook.com/search/pages/?q=${encodeURIComponent(q.company_name ?? term)}` },
  ];
}

export type CaptureRoute = "prospect" | "review" | "homeowner_review";

/** Only a contractor offer carrying a contact point enters the (unverified) prospect table. */
export function decideCaptureRoute(c: Classification, hasContact: boolean): CaptureRoute {
  if (c.signal_type === "homeowner_request") return "homeowner_review";
  if (c.signal_type === "contractor_offer" && hasContact) return "prospect";
  return "review";
}

/** Admin review of a person↔company link. Verified requires an https source. */
export function validateLinkReview(input: { decision?: unknown; evidence_url?: unknown }):
  | { ok: true; status: LinkStatus; evidence_url: string | null }
  | { ok: false; error: string } {
  const d = String(input.decision ?? "");
  if (!["verified", "rejected", "pending"].includes(d)) return { ok: false, error: "invalid_decision" };
  const url = input.evidence_url ? String(input.evidence_url).trim() : null;
  if (d === "verified" && !(url && /^https:\/\/[^\s]+\.[^\s]+/.test(url))) {
    return { ok: false, error: "evidence_url_required" };
  }
  return { ok: true, status: d as LinkStatus, evidence_url: url };
}

/** Admin gate: 401 without a user, 403 without the admin role. */
export async function authorizeScoutAdmin(deps: {
  bearer: string | null;
  getUser: () => Promise<{ id: string } | null>;
  isAdmin: (userId: string) => Promise<boolean>;
}): Promise<{ ok: true; userId: string } | { ok: false; status: 401 | 403; error: string }> {
  if (!deps.bearer || !deps.bearer.startsWith("Bearer ")) return { ok: false, status: 401, error: "unauthorized" };
  const u = await deps.getUser().catch(() => null);
  if (!u) return { ok: false, status: 401, error: "unauthorized" };
  const admin = await deps.isAdmin(u.id).catch(() => false);
  if (!admin) return { ok: false, status: 403, error: "forbidden" };
  return { ok: true, userId: u.id };
}
