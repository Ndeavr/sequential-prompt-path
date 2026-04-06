/**
 * UNPRO — Navigation Configuration by Role
 * All menu definitions aligned with master sitemap.
 * Header, sub-nav, profile menus, mobile tabs, drawer, footer.
 */

import type { UserRole, NavItem, NavigationContext } from "@/types/navigation";

/* ═══════════════════════════════════════════
   1. HEADER NAV — 5 items max per role
   ═══════════════════════════════════════════ */

export const headerNavByRole: Record<UserRole | "guest", NavItem[]> = {
  guest: [
    { to: "/", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/proprietaires", label: "Propriétaires", labelEn: "Homeowners", icon: "Building2" },
    { to: "/entrepreneurs", label: "Entrepreneurs", labelEn: "Contractors", icon: "Briefcase" },
    { to: "/condo", label: "Condo", icon: "Building" },
    { to: "/alex", label: "Alex", labelEn: "Alex", icon: "Sparkles" },
  ],
  homeowner: [
    { to: "/dashboard", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/dashboard/properties", label: "Mes propriétés", labelEn: "My Properties", icon: "Building2" },
    { to: "/dashboard/projects/new", label: "Mes projets", labelEn: "My Projects", icon: "FolderOpen" },
    { to: "/search", label: "Entrepreneurs", labelEn: "Contractors", icon: "Briefcase" },
    { to: "/alex", label: "Alex", labelEn: "Alex", icon: "Sparkles" },
  ],
  contractor: [
    { to: "/pro", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/pro/profile", label: "Mon profil", labelEn: "My Profile", icon: "User" },
    { to: "/pro/leads", label: "Rendez-vous garantis", labelEn: "Guaranteed Appointments", icon: "CalendarCheck" },
    { to: "/pro/appointments", label: "Mes rendez-vous", labelEn: "My Appointments", icon: "CalendarDays" },
    { to: "/alex", label: "Alex", labelEn: "Alex", icon: "Sparkles" },
  ],
  partner: [
    { to: "/dashboard", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/dashboard/syndicates", label: "Dossiers", labelEn: "Cases", icon: "FolderOpen" },
    { to: "/pro/leads", label: "Rendez-vous garantis", labelEn: "Guaranteed Appointments", icon: "CalendarCheck" },
    { to: "/dashboard/home-score", label: "Rapports", labelEn: "Reports", icon: "BarChart3" },
    { to: "/alex", label: "Alex", labelEn: "Alex", icon: "Sparkles" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { to: "/admin/users", label: "Utilisateurs", labelEn: "Users", icon: "Users" },
    { to: "/admin/contractors", label: "Entrepreneurs", labelEn: "Contractors", icon: "Briefcase" },
    { to: "/admin/leads", label: "Rendez-vous", icon: "CalendarCheck" },
    { to: "/admin/agents", label: "Système", labelEn: "System", icon: "Brain" },
  ],
};

/* ═══════════════════════════════════════════
   2. SUB-NAVIGATION by section
   ═══════════════════════════════════════════ */

export const subNavConfig: Record<string, NavItem[]> = {
  // Homeowner sections
  "/dashboard/properties": [
    { to: "/dashboard/properties", label: "Toutes mes propriétés", labelEn: "All Properties", icon: "Building2" },
    { to: "/dashboard/home-score", label: "Home Score", icon: "BarChart3" },
    { to: "/dashboard/documents/upload", label: "Documents", icon: "FileText" },
  ],
  "/dashboard/projects": [
    { to: "/dashboard/projects/new", label: "Projets actifs", labelEn: "Active Projects", icon: "FolderOpen" },
    { to: "/compare-quotes", label: "Analyser mes soumissions", labelEn: "Analyze My Quotes", icon: "Scale" },
    { to: "/dashboard/quotes", label: "Soumissions reçues", labelEn: "Received Quotes", icon: "FileText" },
    { to: "/dashboard/appointments", label: "Rendez-vous", labelEn: "Appointments", icon: "CalendarDays" },
  ],
  "/search": [
    { to: "/search", label: "Trouver un entrepreneur", labelEn: "Find a Contractor", icon: "Search" },
    { to: "/compare-quotes", label: "Comparer", labelEn: "Compare", icon: "Scale" },
  ],
  // Contractor sections
  "/pro/profile": [
    { to: "/pro/profile", label: "Vue d'ensemble", labelEn: "Overview", icon: "User" },
    { to: "/pro/aipp-score", label: "Score AIPP", icon: "Star" },
    { to: "/pro/reviews", label: "Avis", labelEn: "Reviews", icon: "MessageSquare" },
    { to: "/pro/documents", label: "Certifications", labelEn: "Certifications", icon: "Shield" },
  ],
  "/pro/leads": [
    { to: "/pro/leads", label: "Rendez-vous garantis", labelEn: "Guaranteed Appointments", icon: "CalendarCheck" },
    { to: "/pro/territories", label: "Territoires", labelEn: "Territories", icon: "MapPin" },
  ],
  "/pro/appointments": [
    { to: "/pro/appointments", label: "À venir", labelEn: "Upcoming", icon: "CalendarDays" },
  ],
  // Public sections
  "/proprietaires": [
    { to: "/proprietaires", label: "Aperçu", labelEn: "Overview", icon: "Home" },
    { to: "/proprietaires/passeport-maison", label: "Passeport Maison", icon: "FileText" },
    { to: "/proprietaires/score-maison", label: "Score Maison", icon: "BarChart3" },
    { to: "/design", label: "UNPRO Design", icon: "Palette" },
    { to: "/proprietaires/analyser-soumissions", label: "Analyser mes soumissions", labelEn: "Analyze My Quotes", icon: "Scale" },
    { to: "/proprietaires/verifier-entrepreneur", label: "Vérifier un entrepreneur", labelEn: "Verify a Contractor", icon: "ShieldCheck" },
  ],
  "/entrepreneurs": [
    { to: "/entrepreneurs", label: "Aperçu", labelEn: "Overview", icon: "Briefcase" },
    { to: "/entrepreneurs/creer-mon-profil", label: "Créer mon profil", labelEn: "Create My Profile", icon: "UserPlus" },
    { to: "/entrepreneurs/score-aipp", label: "Score AIPP", icon: "Star" },
    { to: "/entrepreneurs/plans", label: "Plans", icon: "CreditCard" },
  ],
  "/condo": [
    { to: "/condo", label: "Aperçu", labelEn: "Overview", icon: "Building" },
    { to: "/condo/fonds-de-prevoyance", label: "Fonds de prévoyance", labelEn: "Reserve Fund", icon: "Wallet" },
    { to: "/condo/carnet-entretien", label: "Carnet d'entretien", labelEn: "Maintenance Log", icon: "BookOpen" },
  ],
};

/* ═══════════════════════════════════════════
   3. PROFILE MENU — Quick actions by role
   ═══════════════════════════════════════════ */

export function getProfileActions(ctx: NavigationContext): NavItem[] {
  const role = ctx.user.activeRole;
  const items: NavItem[] = [];

  if (role === "homeowner" && ctx.homeowner) {
    items.push(
      { to: "/dashboard/properties", label: "Mes propriétés", labelEn: "My Properties", icon: "Building2" },
      { to: "/dashboard/home-score", label: "Mon Home Score", labelEn: "My Home Score", icon: "BarChart3" },
      { to: "/dashboard/appointments", label: "Mes rendez-vous", labelEn: "My Appointments", icon: "CalendarDays" },
      { to: "/dashboard/documents/upload", label: "Mes documents", labelEn: "My Documents", icon: "FileText" },
      { to: "/compare-quotes", label: "Analyser mes soumissions", labelEn: "Analyze My Quotes", icon: "Scale" },
    );
  }

  if (role === "contractor" && ctx.contractor) {
    items.push(
      { to: "/pro/profile", label: "Mon profil entreprise", labelEn: "My Business Profile", icon: "User" },
      { to: "/pro/aipp-score", label: "Mon score AIPP", labelEn: "My AIPP Score", icon: "Star" },
      { to: "/pro/leads", label: "Mes rendez-vous garantis", labelEn: "My Guaranteed Appointments", icon: "CalendarCheck" },
      { to: "/pro/appointments", label: "Mes rendez-vous", labelEn: "My Appointments", icon: "CalendarDays" },
      { to: "/pro/reviews", label: "Mes avis", labelEn: "My Reviews", icon: "MessageSquare" },
      { to: "/pro/billing", label: "Plans & facturation", labelEn: "Plans & Billing", icon: "CreditCard" },
    );
  }

  if (role === "admin") {
    items.push(
      { to: "/admin", label: "Dashboard admin", icon: "LayoutDashboard" },
      { to: "/admin/users", label: "Utilisateurs", labelEn: "Users", icon: "Users" },
      { to: "/admin/contractors", label: "Entrepreneurs", labelEn: "Contractors", icon: "Briefcase" },
      { to: "/admin/agents", label: "Système IA", labelEn: "AI System", icon: "Brain" },
    );
  }

  return items;
}

/* ═══════════════════════════════════════════
   4. CONTEXTUAL STATE ACTIONS (urgency-based)
   ═══════════════════════════════════════════ */

export function getStateActions(ctx: NavigationContext): NavItem[] {
  const items: NavItem[] = [];
  const role = ctx.user.activeRole;

  if (role === "homeowner" && ctx.homeowner) {
    const ho = ctx.homeowner;
    if (ho.propertiesCount === 0) {
      items.push({ to: "/dashboard/properties/new", label: "Ajouter ma première propriété", labelEn: "Add My First Property", icon: "Plus", badgeVariant: "urgent", priority: 100 });
    }
    if (ho.upcomingAppointmentsCount > 0) {
      items.push({ to: "/dashboard/appointments", label: "Mes rendez-vous", labelEn: "My Appointments", icon: "CalendarDays", badge: ho.upcomingAppointmentsCount, badgeVariant: "new", priority: 90 });
    }
    if (ho.activeProjectsCount > 0) {
      items.push({ to: "/dashboard/projects/new", label: "Suivre mon projet", labelEn: "Track My Project", icon: "FolderOpen", priority: 80 });
    }
  }

  if (role === "contractor" && ctx.contractor) {
    const co = ctx.contractor;
    if (co.profileCompletion < 70) {
      items.push({ to: "/pro/profile", label: "Compléter mon profil", labelEn: "Complete My Profile", icon: "User", badge: "Profil incomplet", badgeVariant: "warning", priority: 95 });
    }
    if (!co.activePlan) {
      items.push({ to: "/pro/billing", label: "Activer mon profil", labelEn: "Activate My Profile", icon: "CreditCard", badge: "Action requise", badgeVariant: "urgent", priority: 100 });
    }
    if (co.unreadLeadsCount > 0) {
      items.push({ to: "/pro/leads", label: `${co.unreadLeadsCount} nouveaux rendez-vous`, labelEn: `${co.unreadLeadsCount} New Appointments`, icon: "CalendarCheck", badge: co.unreadLeadsCount, badgeVariant: "new", priority: 90 });
    }
    if (co.aippScore != null && co.aippScore < 50) {
      items.push({ to: "/pro/aipp-score", label: "Améliorer mon score AIPP", labelEn: "Improve My AIPP Score", icon: "Star", badge: "Score faible", badgeVariant: "warning", priority: 70 });
    }
  }

  return items.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/* ═══════════════════════════════════════════
   5. MOBILE BOTTOM NAV — 5 tabs max
   Intent-based, contextual per persona
   ═══════════════════════════════════════════ */

export const mobileTabsByRole: Record<UserRole | "guest", NavItem[]> = {
  guest: [
    { to: "/", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/entrepreneurs", label: "Explorer", labelEn: "Explore", icon: "Compass" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
    { to: "/pricing", label: "Tarifs", labelEn: "Pricing", icon: "CreditCard" },
    { to: "/login", label: "Connexion", labelEn: "Sign In", icon: "LogIn" },
  ],
  homeowner: [
    { to: "/dashboard", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/search", label: "Pro", labelEn: "Pro", icon: "Search" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
    { to: "/compare-quotes", label: "Soumissions", labelEn: "Quotes", icon: "Scale" },
    { to: "/dashboard/account", label: "Compte", labelEn: "Account", icon: "User" },
  ],
  contractor: [
    { to: "/pro", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/pro/leads", label: "Croissance", labelEn: "Growth", icon: "TrendingUp" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
    { to: "/pro/profile", label: "Profil", labelEn: "Profile", icon: "User" },
    { to: "/pro/account", label: "Compte", labelEn: "Account", icon: "Settings" },
  ],
  partner: [
    { to: "/dashboard", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/condo", label: "Condo", labelEn: "Condo", icon: "Building" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
    { to: "/dashboard/syndicates", label: "Conformité", labelEn: "Compliance", icon: "ShieldCheck" },
    { to: "/dashboard/account", label: "Compte", labelEn: "Account", icon: "User" },
  ],
  admin: [
    { to: "/admin", label: "KPIs", icon: "BarChart3" },
    { to: "/admin/contractors", label: "Alertes", labelEn: "Alerts", icon: "AlertTriangle" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
    { to: "/admin/users", label: "Admin", icon: "LayoutDashboard" },
    { to: "/admin/agents", label: "Compte", labelEn: "Account", icon: "User" },
  ],
};

/* ═══════════════════════════════════════════
   5b. QUICK ACTIONS — Contextual per persona
   ═══════════════════════════════════════════ */

export const quickActionsByRole: Record<UserRole | "guest", NavItem[]> = {
  guest: [],
  homeowner: [
    { to: "/search", label: "Trouver le bon pro", labelEn: "Find the right pro", icon: "Search" },
    { to: "/compare-quotes", label: "Comparer soumissions", labelEn: "Compare quotes", icon: "Scale" },
  ],
  contractor: [
    { to: "/pro/aipp-score", label: "Mon score AIPP", labelEn: "My AIPP Score", icon: "Star" },
    { to: "/entrepreneurs/creer-mon-profil", label: "Importer profil", labelEn: "Import profile", icon: "UserPlus" },
  ],
  partner: [
    { to: "/condo", label: "Passeport Condo", labelEn: "Condo Passport", icon: "Building" },
    { to: "/dashboard/syndicates", label: "Outils conformité", labelEn: "Compliance tools", icon: "ShieldCheck" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  ],
};

/* ═══════════════════════════════════════════
   5c. DRAWER SECTIONS — Structured per persona
   ═══════════════════════════════════════════ */

export interface DrawerSection {
  id: string;
  label: string;
  labelEn?: string;
  items: NavItem[];
}

export function getDrawerSections(role: UserRole | "guest"): DrawerSection[] {
  const mainNav: DrawerSection = {
    id: "main",
    label: "Navigation",
    labelEn: "Navigation",
    items: [
      { to: "/", label: "Accueil", labelEn: "Home", icon: "Home" },
      { to: "/proprietaires", label: "Propriétaires", labelEn: "Homeowners", icon: "Building2" },
      { to: "/entrepreneurs", label: "Entrepreneurs", labelEn: "Contractors", icon: "Briefcase" },
      { to: "/condo", label: "Copros", labelEn: "Condos", icon: "Building" },
      { to: "/comment-ca-marche", label: "Comment ça marche", labelEn: "How it works", icon: "HelpCircle" },
      { to: "/pricing", label: "Tarifs", labelEn: "Pricing", icon: "CreditCard" },
    ],
  };

  const personaActions: DrawerSection = {
    id: "actions",
    label: "Actions",
    labelEn: "Actions",
    items: quickActionsByRole[role] || [],
  };

  const utilities: DrawerSection = {
    id: "utilities",
    label: "Outils",
    labelEn: "Tools",
    items: [
      { to: "/search", label: "Vérifier un entrepreneur", labelEn: "Verify a contractor", icon: "ShieldCheck" },
      { to: "/alex", label: "Support Alex", labelEn: "Alex Support", icon: "Sparkles" },
    ],
  };

  return [mainNav, ...(personaActions.items.length > 0 ? [personaActions] : []), utilities];
}

export const personaLabels: Record<UserRole | "guest", { fr: string; en: string; description: string; descriptionEn: string }> = {
  guest: { fr: "Visiteur", en: "Visitor", description: "Découvrez UNPRO", descriptionEn: "Discover UNPRO" },
  homeowner: { fr: "Propriétaire", en: "Homeowner", description: "Maison, condo, projet", descriptionEn: "Home, condo, project" },
  contractor: { fr: "Entrepreneur", en: "Contractor", description: "Visibilité, matchs, croissance", descriptionEn: "Visibility, matches, growth" },
  partner: { fr: "Gestionnaire", en: "Manager", description: "Immeubles, interventions, suivi", descriptionEn: "Buildings, interventions, tracking" },
  admin: { fr: "Admin", en: "Admin", description: "Gestion du système", descriptionEn: "System management" },
};

/* ═══════════════════════════════════════════
   6. MOBILE DRAWER ITEMS
   ═══════════════════════════════════════════ */

export function getDrawerItems(ctx: NavigationContext): NavItem[] {
  const role = ctx.user.activeRole;

  if (role === "homeowner") {
    return [
      { to: "/dashboard/properties", label: "Mes propriétés", labelEn: "My Properties", icon: "Building2" },
      { to: "/dashboard/home-score", label: "Mon Home Score", icon: "BarChart3" },
      { to: "/dashboard/documents/upload", label: "Mes documents", labelEn: "My Documents", icon: "FileText" },
      { to: "/dashboard/appointments", label: "Mes rendez-vous", labelEn: "My Appointments", icon: "CalendarDays" },
      { to: "/dashboard/quotes", label: "Mes soumissions", labelEn: "My Quotes", icon: "FileText" },
      { to: "/compare-quotes", label: "Analyser mes soumissions", labelEn: "Analyze My Quotes", icon: "Scale" },
      { to: "/design", label: "UNPRO Design", icon: "Palette" },
      { to: "/search", label: "Trouver un entrepreneur", labelEn: "Find a Contractor", icon: "Search" },
    ];
  }

  if (role === "contractor") {
    return [
      { to: "/pro/profile", label: "Mon profil entreprise", labelEn: "My Business Profile", icon: "User" },
      { to: "/pro/aipp-score", label: "Mon score AIPP", icon: "Star" },
      { to: "/pro/leads", label: "Mes rendez-vous garantis", labelEn: "My Guaranteed Appointments", icon: "CalendarCheck" },
      { to: "/pro/appointments", label: "Mes rendez-vous", labelEn: "My Appointments", icon: "CalendarDays" },
      { to: "/pro/reviews", label: "Mes avis", labelEn: "My Reviews", icon: "MessageSquare" },
      { to: "/pro/territories", label: "Mes territoires", labelEn: "My Territories", icon: "MapPin" },
      { to: "/pro/billing", label: "Plans & facturation", labelEn: "Plans & Billing", icon: "CreditCard" },
    ];
  }

  if (role === "admin") {
    return [
      { to: "/admin/contractors", label: "Entrepreneurs", labelEn: "Contractors", icon: "Briefcase" },
      { to: "/admin/appointments", label: "Rendez-vous", labelEn: "Appointments", icon: "CalendarDays" },
      { to: "/admin/quotes", label: "Soumissions", labelEn: "Quotes", icon: "FileText" },
      { to: "/admin/reviews", label: "Avis", labelEn: "Reviews", icon: "Star" },
      { to: "/admin/documents", label: "Documents", icon: "FolderOpen" },
      { to: "/admin/growth", label: "Croissance", labelEn: "Growth", icon: "BarChart3" },
      { to: "/admin/media", label: "Média IA", icon: "Palette" },
      { to: "/admin/validation", label: "Validation", icon: "ShieldCheck" },
    ];
  }

  // Guest drawer
  return [
    { to: "/proprietaires", label: "Propriétaires", labelEn: "Homeowners", icon: "Building2" },
    { to: "/entrepreneurs", label: "Entrepreneurs", labelEn: "Contractors", icon: "Briefcase" },
    { to: "/condo", label: "Condo / Immeubles", labelEn: "Condos", icon: "Building" },
    { to: "/design", label: "UNPRO Design", icon: "Palette" },
    { to: "/compare-quotes", label: "Analyser des soumissions", labelEn: "Analyze Quotes", icon: "Scale" },
    { to: "/search", label: "Vérifier un entrepreneur", labelEn: "Verify a Contractor", icon: "ShieldCheck" },
    { to: "/score-maison", label: "Score Maison", labelEn: "Home Score", icon: "BarChart3" },
    { to: "/aipp-score", label: "Score AIPP", icon: "Star" },
    { to: "/pricing", label: "Tarifs", labelEn: "Pricing", icon: "CreditCard" },
  ];
}

/* ═══════════════════════════════════════════
   7. FOOTER LINKS — multi-column by role
   ═══════════════════════════════════════════ */

export interface FooterSection {
  title: string;
  titleEn?: string;
  items: NavItem[];
}

export function getFooterSections(role: UserRole | "guest"): FooterSection[] {
  const discoverSection: FooterSection = {
    title: "Découvrez",
    titleEn: "Discover",
    items: [
      { to: "/probleme/infiltration-eau", label: "Problèmes maison", labelEn: "Home Problems", icon: "AlertTriangle" },
      { to: "/ville/montreal", label: "Villes desservies", labelEn: "Served Cities", icon: "MapPin" },
      { to: "/services/laval", label: "Services à Laval", icon: "Wrench" },
      { to: "/services/terrebonne", label: "Services à Terrebonne", icon: "Wrench" },
      { to: "/profession/plombier", label: "Professionnels", labelEn: "Professionals", icon: "Users" },
      { to: "/entretien-preventif", label: "Entretien préventif", labelEn: "Preventive Maintenance", icon: "Shield" },
    ],
  };

  const blogSection: FooterSection = {
    title: "Blog",
    titleEn: "Blog",
    items: [
      { to: "/blog", label: "Derniers articles", labelEn: "Latest Articles", icon: "FileText" },
      { to: "/blog/renovation", label: "Guides rénovation", labelEn: "Renovation Guides", icon: "Wrench" },
      { to: "/blog/entretien", label: "Conseils entretien", labelEn: "Maintenance Tips", icon: "Shield" },
      { to: "/blog/condo", label: "Vie en condo", labelEn: "Condo Living", icon: "Building" },
    ],
  };

  if (role === "guest") {
    return [
      {
        title: "Propriétaires",
        titleEn: "Homeowners",
        items: [
          { to: "/proprietaires", label: "Passeport Maison", icon: "FileText" },
          { to: "/compare-quotes", label: "Analyser des soumissions", labelEn: "Analyze Quotes", icon: "Scale" },
          { to: "/search", label: "Vérifier un entrepreneur", labelEn: "Verify a Contractor", icon: "ShieldCheck" },
          { to: "/decrire-projet", label: "Décrire mon projet", labelEn: "Describe My Project", icon: "PenLine" },
          { to: "/alex", label: "Parler à Alex", labelEn: "Talk to Alex", icon: "Sparkles" },
        ],
      },
      {
        title: "Entrepreneurs",
        titleEn: "Contractors",
        items: [
          { to: "/entrepreneurs", label: "Créer mon profil", labelEn: "Create My Profile", icon: "UserPlus" },
          { to: "/aipp-score", label: "Score AIPP", icon: "Star" },
          { to: "/pricing", label: "Plans", icon: "CreditCard" },
        ],
      },
      discoverSection,
      blogSection,
    ];
  }

  if (role === "homeowner") {
    return [
      {
        title: "Mon espace",
        titleEn: "My Space",
        items: [
          { to: "/dashboard/properties", label: "Mes propriétés", labelEn: "My Properties", icon: "Building2" },
          { to: "/compare-quotes", label: "Analyser mes soumissions", labelEn: "Analyze My Quotes", icon: "Scale" },
          { to: "/search", label: "Trouver un entrepreneur", labelEn: "Find a Contractor", icon: "Search" },
          { to: "/decrire-projet", label: "Décrire mon projet", labelEn: "Describe My Project", icon: "PenLine" },
          { to: "/alex", label: "Parler à Alex", labelEn: "Talk to Alex", icon: "Sparkles" },
        ],
      },
      discoverSection,
      blogSection,
    ];
  }

  if (role === "contractor") {
    return [
      {
        title: "Mon entreprise",
        titleEn: "My Business",
        items: [
          { to: "/pro/profile", label: "Mon profil", labelEn: "My Profile", icon: "User" },
          { to: "/pro/aipp-score", label: "Score AIPP", icon: "Star" },
          { to: "/pro/leads", label: "Rendez-vous garantis", labelEn: "Guaranteed Appointments", icon: "CalendarCheck" },
          { to: "/pro/billing", label: "Plans", icon: "CreditCard" },
          { to: "/pro/reviews", label: "Avis", labelEn: "Reviews", icon: "MessageSquare" },
        ],
      },
      discoverSection,
      blogSection,
    ];
  }

  return [discoverSection, blogSection];
}

/** Legacy flat footer links — kept for backward compatibility */
export function getFooterLinks(role: UserRole | "guest"): NavItem[] {
  const sections = getFooterSections(role);
  return sections.flatMap((s) => s.items);
}
