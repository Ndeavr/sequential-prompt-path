/**
 * UNPRO — useNavigationContext
 * Aggregates all user state into a NavigationContext for programmatic navigation.
 * Uses shared ActiveRoleContext for role state.
 */

import { useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useProperties } from "@/hooks/useProperties";
import { useContractorProfile } from "@/hooks/useContractor";
import { useAppointments, useContractorAppointments } from "@/hooks/useAppointments";
import { useContractorLeads } from "@/hooks/useLeads";
import { useContractorSubscription } from "@/hooks/useSubscription";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { useActiveRole } from "@/contexts/ActiveRoleContext";
import type { NavigationContext, UserRole } from "@/types/navigation";

function computeContractorCompletion(c: any): number {
  if (!c) return 0;
  const fields = [
    c.business_name, c.specialty, c.description, c.phone, c.email,
    c.city, c.province, c.postal_code, c.license_number, c.insurance_info,
    c.website, c.years_experience, c.logo_url,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

export const useNavigationContext = (): {
  ctx: NavigationContext | null;
  activeRole: UserRole | "guest";
  setActiveRole: (role: UserRole) => void;
  isLoading: boolean;
} => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: properties } = useProperties();
  const { data: contractor } = useContractorProfile();
  const { data: homeownerAppts } = useAppointments();
  const { data: contractorAppts } = useContractorAppointments();
  const { data: leads } = useContractorLeads();
  const { data: subscription } = useContractorSubscription();
  const { lang } = useLanguage();
  const { activeRole, setActiveRole, availableRoles } = useActiveRole();

  const ctx = useMemo<NavigationContext | null>(() => {
    if (!isAuthenticated || !user) return null;

    const firstName = profile?.full_name?.split(" ")[0] || user.user_metadata?.full_name?.split(" ")[0] || "";

    const upcomingHOAppts = (homeownerAppts ?? []).filter(
      (a: any) => a.status === "pending" || a.status === "scheduled"
    ).length;

    const upcomingCOAppts = (contractorAppts ?? []).filter(
      (a: any) => a.status === "pending" || a.status === "scheduled"
    ).length;

    const unreadLeads = (leads ?? []).filter((l: any) => l.status === "new" || !l.status).length;

    return {
      user: {
        firstName,
        fullName: profile?.full_name || user.user_metadata?.full_name || "",
        email: user.email || "",
        avatarUrl: profile?.avatar_url || undefined,
        roles: availableRoles,
        activeRole: activeRole as UserRole,
        language: lang as "fr" | "en",
      },
      homeowner: {
        propertiesCount: properties?.length ?? 0,
        properties: (properties ?? []).map((p: any) => ({
          id: p.id,
          address: p.address,
          city: p.city,
        })),
        activePropertyId: undefined,
        passportCompletion: 0,
        homeScore: undefined,
        activeProjectsCount: 0,
        upcomingAppointmentsCount: upcomingHOAppts,
        unreadDocumentsCount: 0,
      },
      contractor: contractor
        ? {
            profileCompletion: computeContractorCompletion(contractor),
            aippScore: contractor.aipp_score ?? undefined,
            activePlan: subscription?.plan_id ?? null,
            unreadLeadsCount: unreadLeads,
            upcomingAppointmentsCount: upcomingCOAppts,
            reviewsCount: contractor.review_count ?? 0,
            isPublished: contractor.verification_status === "verified",
            businessName: contractor.business_name,
          }
        : undefined,
      system: {
        notificationsCount: upcomingHOAppts + unreadLeads,
        urgentActionsCount: 0,
      },
    };
  }, [isAuthenticated, user, profile, properties, homeownerAppts, contractorAppts, leads, contractor, subscription, availableRoles, activeRole, lang]);

  return {
    ctx,
    activeRole: activeRole as (UserRole | "guest"),
    setActiveRole,
    isLoading: authLoading || profileLoading,
  };
};
