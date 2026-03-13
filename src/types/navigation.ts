/**
 * UNPRO — Programmatic Navigation Types
 */

export type UserRole = "homeowner" | "contractor" | "partner" | "admin";

export interface NavigationContext {
  user: {
    firstName: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
    roles: UserRole[];
    activeRole: UserRole;
    language: "fr" | "en";
  };
  homeowner?: {
    propertiesCount: number;
    properties: { id: string; address: string; city?: string }[];
    activePropertyId?: string;
    passportCompletion: number;
    homeScore?: number;
    activeProjectsCount: number;
    upcomingAppointmentsCount: number;
    unreadDocumentsCount: number;
  };
  contractor?: {
    profileCompletion: number;
    aippScore?: number;
    activePlan: string | null;
    unreadLeadsCount: number;
    upcomingAppointmentsCount: number;
    reviewsCount: number;
    isPublished: boolean;
    businessName?: string;
  };
  partner?: {
    organizationName?: string;
    openOpportunitiesCount: number;
  };
  system: {
    notificationsCount: number;
    urgentActionsCount: number;
  };
  intent?: {
    currentIntent?:
      | "compare_quotes"
      | "find_contractor"
      | "manage_property"
      | "improve_profile"
      | "get_leads"
      | "book_appointment";
  };
}

export interface NavItem {
  to: string;
  label: string;
  labelEn?: string;
  icon: string; // lucide icon name
  badge?: string | number;
  badgeVariant?: "default" | "urgent" | "new" | "warning";
  priority?: number;
  children?: NavItem[];
}

export interface NavSection {
  id: string;
  label: string;
  items: NavItem[];
}
