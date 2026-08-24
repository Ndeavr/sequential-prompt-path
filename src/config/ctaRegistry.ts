/**
 * ctaRegistry — single source of truth for the 4 canonical UNPRO CTAs.
 * Every page must surface at least one of these. Enforced by <PageShell>
 * + <MobileQAOverlay>.
 */

export type CanonicalCTA = "alex" | "create_project" | "activate_profile" | "book";

export interface CTADescriptor {
  href: string;
  label: string;
  analyticsId: string;
}

export const CTA_DEST: Record<CanonicalCTA, CTADescriptor> = {
  alex: {
    href: "/alex",
    label: "Parler à Alex",
    analyticsId: "cta_alex",
  },
  create_project: {
    href: "/project/new",
    label: "Créer mon projet",
    analyticsId: "cta_create_project",
  },
  activate_profile: {
    href: "/entrepreneurs/audit-ia",
    label: "Voir comment l'IA voit mon entreprise",
    analyticsId: "cta_activate_profile",
  },
  book: {
    href: "/recommendations",
    label: "Prendre rendez-vous",
    analyticsId: "cta_book",
  },
};

export function resolveCTA(name: CanonicalCTA): CTADescriptor {
  return CTA_DEST[name];
}
