/**
 * UNPRO — Routes Configuration
 * Centralized route path constants.
 */

export const ROUTES = {
  // Public — French-first
  HOME: "/",
  SEARCH: "/search",
  PROPRIETAIRES: "/proprietaires",
  ENTREPRENEURS: "/entrepreneurs",
  CONDO: "/condo",
  ALEX: "/alex",

  // Public — tools
  COMPARE_QUOTES: "/compare-quotes",
  VERIFY_CONTRACTOR: "/verifier-entrepreneur",
  SCORE_MAISON: "/score-maison",
  AIPP_SCORE: "/aipp-score",
  PRICING: "/pricing",

  // Public — legacy English
  HOMEOWNERS: "/homeowners",
  PROFESSIONALS: "/professionals",
  CONTRACTOR_PROFILE: "/contractors/:id",
  CONTRACTORS: "/contractors",
  PUBLIC_PROPERTY: "/maison/:slug",

  // Homeowner Dashboard
  DASHBOARD: "/dashboard",
  DASHBOARD_PROPERTIES: "/dashboard/properties",
  DASHBOARD_PROPERTIES_NEW: "/dashboard/properties/new",
  DASHBOARD_PROPERTY: "/dashboard/properties/:id",
  DASHBOARD_QUOTES: "/dashboard/quotes",
  DASHBOARD_HOME_SCORE: "/dashboard/home-score",
  DASHBOARD_APPOINTMENTS: "/dashboard/appointments",
  DASHBOARD_DOCUMENTS: "/dashboard/documents/upload",
  DASHBOARD_PROJECTS: "/dashboard/projects/new",
  DASHBOARD_ACCOUNT: "/dashboard/account",

  // Contractor Pro
  PRO_DASHBOARD: "/pro",
  PRO_PROFILE: "/pro/profile",
  PRO_AIPP_SCORE: "/pro/aipp-score",
  PRO_LEADS: "/pro/leads",
  PRO_APPOINTMENTS: "/pro/appointments",
  PRO_REVIEWS: "/pro/reviews",
  PRO_BILLING: "/pro/billing",
  PRO_TERRITORIES: "/pro/territories",
  PRO_DOCUMENTS: "/pro/documents",
  PRO_ACCOUNT: "/pro/account",
  PRO_DOMAIN_INTELLIGENCE: "/pro/domain-intelligence",

  // Admin
  ADMIN_DASHBOARD: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_CONTRACTORS: "/admin/contractors",
  ADMIN_LEADS: "/admin/leads",
  ADMIN_APPOINTMENTS: "/admin/appointments",
  ADMIN_QUOTES: "/admin/quotes",
  ADMIN_REVIEWS: "/admin/reviews",
  ADMIN_AGENTS: "/admin/agents",
  ADMIN_GROWTH: "/admin/growth",
  ADMIN_VALIDATION: "/admin/validation",
  ADMIN_DOMAIN_INTELLIGENCE: "/admin/domain-intelligence",

  // Auth
  LOGIN: "/login",
  SIGNUP: "/signup",

  // SEO
  SEO_PROBLEME: "/probleme/:slug",
  SEO_PROBLEME_CITY: "/probleme/:problem/:city",
  SEO_SOLUTION: "/solution/:slug",
  SEO_PROFESSION: "/profession/:slug",
  SEO_VILLE: "/ville/:slug",
  SEO_SERVICES: "/services",
} as const;
