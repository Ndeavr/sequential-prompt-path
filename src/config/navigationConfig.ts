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
    { to: "/pro/leads", label: "Opportunités", labelEn: "Opportunities", icon: "TrendingUp" },
    { to: "/dashboard/home-score", label: "Rapports", labelEn: "Reports", icon: "BarChart3" },
    { to: "/alex", label: "Alex", labelEn: "Alex", icon: "Sparkles" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { to: "/admin/users", label: "Utilisateurs", labelEn: "Users", icon: "Users" },
    { to: "/admin/contractors", label: "Entrepreneurs", labelEn: "Contractors", icon: "Briefcase" },
    { to: "/admin/leads", label: "Leads", icon: "TrendingUp" },
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
    { to: "/compare-quotes", label: "Comparer 3 soumissions", labelEn: "Compare 3 Quotes", icon: "Scale" },
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
    { to: "/pro/leads", label: "Nouveaux leads", labelEn: "New Leads", icon: "TrendingUp" },
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
    { to: "/proprietaires/comparer-3-soumissions", label: "Comparer 3 soumissions", labelEn: "Compare 3 Quotes", icon: "Scale" },
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
      { to: "/compare-quotes", label: "Comparer 3 soumissions", labelEn: "Compare 3 Quotes", icon: "Scale" },
    );
  }

  if (role === "contractor" && ctx.contractor) {
    items.push(
      { to: "/pro/profile", label: "Mon profil entreprise", labelEn: "My Business Profile", icon: "User" },
      { to: "/pro/aipp-score", label: "Mon score AIPP", labelEn: "My AIPP Score", icon: "Star" },
      { to: "/pro/leads", label: "Mes leads", labelEn: "My Leads", icon: "TrendingUp" },
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
      items.push({ to: "/pro/leads", label: `${co.unreadLeadsCount} nouvelles opportunités`, labelEn: `${co.unreadLeadsCount} New Opportunities`, icon: "TrendingUp", badge: co.unreadLeadsCount, badgeVariant: "new", priority: 90 });
    }
    if (co.aippScore != null && co.aippScore < 50) {
      items.push({ to: "/pro/aipp-score", label: "Améliorer mon score AIPP", labelEn: "Improve My AIPP Score", icon: "Star", badge: "Score faible", badgeVariant: "warning", priority: 70 });
    }
  }

  return items.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
}

/* ═══════════════════════════════════════════
   5. MOBILE BOTTOM NAV — 5 tabs max
   ═══════════════════════════════════════════ */

export const mobileTabsByRole: Record<UserRole | "guest", NavItem[]> = {
  guest: [
    { to: "/", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/proprietaires", label: "Services", icon: "Building2" },
    { to: "/search", label: "Pros", icon: "Search" },
    { to: "/entrepreneurs", label: "Entreprises", labelEn: "Business", icon: "Briefcase" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
  ],
  homeowner: [
    { to: "/dashboard", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/dashboard/properties", label: "Propriétés", labelEn: "Properties", icon: "Building2" },
    { to: "/dashboard/projects/new", label: "Projets", labelEn: "Projects", icon: "FolderOpen" },
    { to: "/search", label: "Entrepreneurs", labelEn: "Contractors", icon: "Search" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
  ],
  contractor: [
    { to: "/pro", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/pro/profile", label: "Profil", labelEn: "Profile", icon: "User" },
    { to: "/pro/leads", label: "Leads", icon: "TrendingUp" },
    { to: "/pro/appointments", label: "RDV", labelEn: "Appts", icon: "CalendarDays" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
  ],
  partner: [
    { to: "/dashboard", label: "Accueil", labelEn: "Home", icon: "Home" },
    { to: "/dashboard/syndicates", label: "Dossiers", labelEn: "Cases", icon: "FolderOpen" },
    { to: "/search", label: "Pros", icon: "Search" },
    { to: "/dashboard/appointments", label: "RDV", labelEn: "Appts", icon: "CalendarDays" },
    { to: "/alex", label: "Alex", icon: "Sparkles" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
    { to: "/admin/users", label: "Users", icon: "Users" },
    { to: "/admin/leads", label: "Leads", icon: "TrendingUp" },
    { to: "/admin/contractors", label: "Pros", icon: "Briefcase" },
    { to: "/admin/agents", label: "Système", labelEn: "System", icon: "Brain" },
  ],
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
      { to: "/compare-quotes", label: "Comparer 3 soumissions", labelEn: "Compare 3 Quotes", icon: "Scale" },
      { to: "/search", label: "Trouver un entrepreneur", labelEn: "Find a Contractor", icon: "Search" },
    ];
  }

  if (role === "contractor") {
    return [
      { to: "/pro/profile", label: "Mon profil entreprise", labelEn: "My Business Profile", icon: "User" },
      { to: "/pro/aipp-score", label: "Mon score AIPP", icon: "Star" },
      { to: "/pro/leads", label: "Mes opportunités", labelEn: "My Opportunities", icon: "TrendingUp" },
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
    { to: "/compare-quotes", label: "Comparer 3 soumissions", labelEn: "Compare 3 Quotes", icon: "Scale" },
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
  const seoSection: FooterSection = {
    title: "Découvrir",
    titleEn: "Explore",
    items: [
      { to: "/probleme/infiltration-eau", label: "Problèmes maison", labelEn: "Home Problems", icon: "AlertTriangle" },
      { to: "/ville/montreal", label: "Villes", labelEn: "Cities", icon: "MapPin" },
      { to: "/services", label: "Services", icon: "Wrench" },
      { to: "/profession/plombier", label: "Professionnels", labelEn: "Professionals", icon: "Users" },
    ],
  };

  if (role === "guest") {
    return [
      {
        title: "Propriétaires",
        titleEn: "Homeowners",
        items: [
          { to: "/proprietaires", label: "Passeport Maison", icon: "FileText" },
          { to: "/compare-quotes", label: "Comparer 3 soumissions", labelEn: "Compare 3 Quotes", icon: "Scale" },
          { to: "/search", label: "Vérifier un entrepreneur", labelEn: "Verify a Contractor", icon: "ShieldCheck" },
          { to: "/score-maison", label: "Score Maison", labelEn: "Home Score", icon: "BarChart3" },
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
      seoSection,
    ];
  }

  if (role === "homeowner") {
    return [
      {
        title: "Mon espace",
        titleEn: "My Space",
        items: [
          { to: "/dashboard/properties", label: "Mes propriétés", labelEn: "My Properties", icon: "Building2" },
          { to: "/compare-quotes", label: "Comparer 3 soumissions", labelEn: "Compare 3 Quotes", icon: "Scale" },
          { to: "/search", label: "Trouver un entrepreneur", labelEn: "Find a Contractor", icon: "Search" },
          { to: "/dashboard/home-score", label: "Home Score", icon: "BarChart3" },
        ],
      },
      seoSection,
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
          { to: "/pro/leads", label: "Leads", icon: "TrendingUp" },
          { to: "/pro/billing", label: "Plans", icon: "CreditCard" },
          { to: "/pro/reviews", label: "Avis", labelEn: "Reviews", icon: "MessageSquare" },
        ],
      },
      seoSection,
    ];
  }

  return [seoSection];
}

/** Legacy flat footer links — kept for backward compatibility */
export function getFooterLinks(role: UserRole | "guest"): NavItem[] {
  const sections = getFooterSections(role);
  return sections.flatMap((s) => s.items);
}
