/**
 * UNPRO — QR Intent Configuration
 * Static config for all share intents with copy variants.
 */

export interface QrIntent {
  slug: string;
  labelFr: string;
  labelEn: string;
  subtitleFr: string;
  subtitleEn: string;
  ctaFr: string;
  ctaEn: string;
  icon: string;
  roleTarget: "homeowner" | "contractor" | "all";
  destinationPath: string;
  gradient: string;
  badge?: string;
  copyVariants: string[];
  stylePreset: "default" | "premium" | "exclusive";
  isRestricted?: boolean;
  limitTotal?: number;
}

export const QR_INTENTS: QrIntent[] = [
  {
    slug: "kitchen-dream",
    labelFr: "Cuisine de rêve",
    labelEn: "Kitchen Dream",
    subtitleFr: "T'aimerais voir de quoi ta nouvelle cuisine aurait l'air ?",
    subtitleEn: "Want to see what your new kitchen could look like?",
    ctaFr: "Commencer",
    ctaEn: "Get Started",
    icon: "ChefHat",
    roleTarget: "homeowner",
    destinationPath: "/design?room=kitchen",
    gradient: "from-violet-500/15 via-fuchsia-500/5 to-transparent",
    badge: "Design IA",
    copyVariants: [
      "T'aimerais voir de quoi ta nouvelle cuisine aurait l'air ?",
      "Avant de dépenser, vois le résultat.",
      "Upload une photo. Transforme-la avec l'IA.",
    ],
    stylePreset: "default",
  },
  {
    slug: "bathroom-dream",
    labelFr: "Salle de bain",
    labelEn: "Bathroom Dream",
    subtitleFr: "Curieux de voir ta salle de bain avant les travaux ?",
    subtitleEn: "Curious about your bathroom before the reno?",
    ctaFr: "Commencer",
    ctaEn: "Get Started",
    icon: "Bath",
    roleTarget: "homeowner",
    destinationPath: "/design?room=bathroom",
    gradient: "from-cyan-500/15 via-blue-500/5 to-transparent",
    badge: "Design IA",
    copyVariants: [
      "Curieux de voir ta salle de bain avant les travaux ?",
      "Upload une photo. Transforme-la avec l'IA.",
    ],
    stylePreset: "default",
  },
  {
    slug: "find-contractor",
    labelFr: "Trouver un pro",
    labelEn: "Find a Pro",
    subtitleFr: "Plus simple qu'une chasse aux soumissions.",
    subtitleEn: "Easier than chasing quotes.",
    ctaFr: "Chercher",
    ctaEn: "Search",
    icon: "Search",
    roleTarget: "homeowner",
    destinationPath: "/search",
    gradient: "from-blue-500/15 via-primary/5 to-transparent",
    copyVariants: [
      "Plus simple qu'une chasse aux soumissions.",
      "Décris ton projet, ajoute des photos, commence ici.",
    ],
    stylePreset: "default",
  },
  {
    slug: "emergency-help",
    labelFr: "Urgence",
    labelEn: "Emergency",
    subtitleFr: "Dégât urgent ? Commence ici.",
    subtitleEn: "Emergency damage? Start here.",
    ctaFr: "Obtenir de l'aide",
    ctaEn: "Get Help",
    icon: "AlertTriangle",
    roleTarget: "all",
    destinationPath: "/emergency",
    gradient: "from-red-500/15 via-orange-500/5 to-transparent",
    badge: "Urgent",
    copyVariants: [
      "Dégât urgent ? Commence ici.",
      "Ajoute une photo, décris le problème, parle à Alex.",
    ],
    stylePreset: "default",
  },
  {
    slug: "ai-design",
    labelFr: "Design IA",
    labelEn: "AI Design",
    subtitleFr: "Upload une photo. Transforme-la avec l'IA.",
    subtitleEn: "Upload a photo. Transform it with AI.",
    ctaFr: "Essayer",
    ctaEn: "Try it",
    icon: "Palette",
    roleTarget: "all",
    destinationPath: "/design",
    gradient: "from-purple-500/15 via-violet-500/5 to-transparent",
    badge: "Design IA",
    copyVariants: [
      "Upload une photo. Transforme-la avec l'IA.",
      "Avant de dépenser, vois le résultat.",
    ],
    stylePreset: "default",
  },
  {
    slug: "register-business",
    labelFr: "Inscrire entreprise",
    labelEn: "Register Business",
    subtitleFr: "Sois visible quand un client sérieux cherche ton service.",
    subtitleEn: "Be visible when serious clients search.",
    ctaFr: "Créer mon profil",
    ctaEn: "Create Profile",
    icon: "Building2",
    roleTarget: "contractor",
    destinationPath: "/contractor-onboarding",
    gradient: "from-amber-500/15 via-orange-500/5 to-transparent",
    badge: "Pro",
    copyVariants: [
      "Tu devrais inscrire ton entreprise.",
      "Reçois des rendez-vous exclusifs.",
      "Prends ta place avant que ton secteur se remplisse.",
    ],
    stylePreset: "default",
  },
  {
    slug: "invite-contractor",
    labelFr: "Inviter un pro",
    labelEn: "Invite a Pro",
    subtitleFr: "Tu connais un entrepreneur compétent ?",
    subtitleEn: "Know a great contractor?",
    ctaFr: "Envoyer l'invitation",
    ctaEn: "Send Invite",
    icon: "UserPlus",
    roleTarget: "all",
    destinationPath: "/contractor-onboarding",
    gradient: "from-emerald-500/15 via-green-500/5 to-transparent",
    copyVariants: [
      "Tu connais un bon entrepreneur ? Invite-le.",
      "Les meilleurs devraient être visibles ici.",
      "Aide un pro solide à prendre sa place.",
    ],
    stylePreset: "default",
  },
  {
    slug: "beta-ambassador",
    labelFr: "Ambassadeur",
    labelEn: "Ambassador",
    subtitleFr: "Deviens ambassadeur UNPRO et gagne des récompenses.",
    subtitleEn: "Become an UNPRO ambassador and earn rewards.",
    ctaFr: "Rejoindre",
    ctaEn: "Join",
    icon: "Award",
    roleTarget: "all",
    destinationPath: "/ambassadeurs",
    gradient: "from-yellow-500/15 via-amber-500/5 to-transparent",
    badge: "Ambassadeur",
    copyVariants: ["Deviens ambassadeur et gagne des récompenses."],
    stylePreset: "default",
  },
  {
    slug: "ambassador-lifetime",
    labelFr: "Offre à vie",
    labelEn: "Lifetime Offer",
    subtitleFr: "Certains entrepreneurs ne paieront jamais d'abonnement.",
    subtitleEn: "Some contractors will never pay a subscription.",
    ctaFr: "Réserver ma place",
    ctaEn: "Reserve My Spot",
    icon: "Crown",
    roleTarget: "contractor",
    destinationPath: "/unlock?intent=ambassador-lifetime",
    gradient: "from-yellow-400/20 via-amber-500/10 to-transparent",
    badge: "Limité",
    isRestricted: true,
    limitTotal: 50,
    copyVariants: [
      "T'aimerais ça pas avoir à payer de frais mensuels… jamais ?",
      "Certains entrepreneurs ne paieront jamais d'abonnement. Tu fais peut-être partie des 50 prochains.",
      "Il reste des places. Pas pour longtemps.",
      "Je t'envoie ça parce que t'es bon. Regarde ça.",
    ],
    stylePreset: "premium",
  },
];

/** Filter intents by user role */
export function getIntentsForRole(role: "homeowner" | "contractor" | "admin" | "guest"): QrIntent[] {
  if (role === "admin") return QR_INTENTS;
  if (role === "contractor") {
    return QR_INTENTS.filter(
      (i) => i.roleTarget === "contractor" || i.roleTarget === "all"
    );
  }
  // homeowner or guest
  return QR_INTENTS.filter(
    (i) => i.roleTarget === "homeowner" || i.roleTarget === "all"
  );
}
