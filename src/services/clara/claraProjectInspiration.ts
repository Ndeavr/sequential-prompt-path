/**
 * « Je veux un projet semblable » — passage d'une réalisation approuvée vers le
 * parcours propriétaire de Clara. Aucune coordonnée n'est exposée; une demande
 * de contact est seulement NOTÉE, jamais présentée comme un contact établi.
 * Un auteur non vérifié n'est jamais présenté comme un entrepreneur vérifié.
 */
export const CLARA_PROJECT_INSPIRATION_EVENT = "unpro:clara-project-inspiration";

export interface ProjectInspiration {
  projectId: string;
  title: string;
  serviceName: string | null;
  city: string | null;
  companyName: string | null;
  authorVerified: boolean;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean = (v: unknown, max = 120) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export function parseInspirationDetail(raw: unknown): ProjectInspiration | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.projectId !== "string" || !UUID_RE.test(r.projectId)) return null;
  const title = clean(r.title);
  if (!title) return null;
  return {
    projectId: r.projectId, title, serviceName: clean(r.serviceName, 80), city: clean(r.city, 80),
    companyName: clean(r.companyName), authorVerified: r.authorVerified === true,
  };
}

export const INSPIRATION_CONTACT_CHOICE = "Demander à joindre l’auteur de ce projet";
export const INSPIRATION_FIND_CHOICE = "Trouver un professionnel compatible";
export const inspirationChoices = () => [INSPIRATION_CONTACT_CHOICE, INSPIRATION_FIND_CHOICE];

export function inspirationGreeting(p: ProjectInspiration): string {
  const what = [p.serviceName, p.city].filter(Boolean).join(" à ");
  return `Bon choix d’inspiration : « ${p.title} »${what ? ` (${what})` : ""}. Voulez-vous demander à joindre l’auteur de ce projet, ou que je cherche un professionnel compatible avec votre situation?`;
}

export type InspirationChoice = "contact_author" | "find_compatible" | null;
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’']/g, "'").toLowerCase().trim();

export function matchInspirationChoice(text: string): InspirationChoice {
  const t = norm(text);
  if (t === norm(INSPIRATION_CONTACT_CHOICE) || /\b(joindre|contacter|parler)\b.*\bauteur\b/.test(t)) return "contact_author";
  if (t === norm(INSPIRATION_FIND_CHOICE)) return "find_compatible";
  return null;
}

/** Réponse honnête : intérêt noté, aucun contact établi, vérification d'abord. */
export function authorInterestReply(p: ProjectInspiration): string {
  const who = p.companyName ? `l’entreprise ${p.companyName}` : "l’auteur de ce projet";
  if (!p.authorVerified) {
    return `C’est noté : votre intérêt pour ${who} est enregistré, mais aucun contact n’a eu lieu. Cette entreprise n’est pas encore vérifiée par UNPRO, alors je ne peux pas la recommander ni réserver un rendez-vous avec elle. Je peux chercher un professionnel vérifié et compatible : décrivez-moi votre projet et votre ville.`;
  }
  return `C’est noté : votre demande pour ${who} est enregistrée. Aucun contact n’a encore eu lieu : je dois d’abord confirmer que ce professionnel dessert votre secteur et ce type de projet. Décrivez-moi votre projet et votre ville.`;
}

export function findCompatibleReply(p: ProjectInspiration): string {
  return `Parfait. Décrivez-moi votre projet${p.serviceName ? ` de ${p.serviceName.toLowerCase()}` : ""} : ce que vous voulez faire et dans quelle ville.`;
}
