/**
 * UNPRO — Routes Configuration
 * Centralized route path constants.
 */

export const ROUTES = {
  // Public
  HOME: "/",
  SEARCH: "/search",
  CONTRACTOR_PROFILE: "/contractors/:id",
  CONTRACTORS: "/contractors",
  VERIFY_CONTRACTOR: "/verify",

  // Homeowner Dashboard
  DASHBOARD_QUOTES: "/dashboard/quotes",
  DASHBOARD_HOME_SCORE: "/dashboard/home-score",
  DASHBOARD_AIPP_SCORE: "/dashboard/aipp-score",

  // Contractor Pro
  PRO_DASHBOARD: "/pro",
  PRO_LEADS: "/pro/leads",
  PRO_ANALYTICS: "/pro/analytics",
  PRO_CALENDAR: "/pro/calendar",

  // Admin
  ADMIN_DASHBOARD: "/admin",
  ADMIN_USERS: "/admin/users",
  ADMIN_VERIFICATION: "/admin/verification",

  // Auth
  LOGIN: "/login",
  SIGNUP: "/signup",
} as const;
