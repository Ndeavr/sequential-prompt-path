import { supabase } from "@/integrations/supabase/client";

export interface FreeServiceEntitlement {
  authenticated: boolean;
  active: boolean;
  membership_id: string | null;
  contractor_id: string | null;
  business_name: string | null;
  city: string | null;
  category_slug: string | null;
  status: string | null;
  founder_start: string | null;
  founder_end: string | null;
  offer_code: string | null;
  profile_complete: boolean;
  calendar_connected: boolean;
  booking_enabled: boolean;
}

const EMPTY_ENTITLEMENT: FreeServiceEntitlement = {
  authenticated: false,
  active: false,
  membership_id: null,
  contractor_id: null,
  business_name: null,
  city: null,
  category_slug: null,
  status: null,
  founder_start: null,
  founder_end: null,
  offer_code: null,
  profile_complete: false,
  calendar_connected: false,
  booking_enabled: false,
};

export async function getMyFreeServiceEntitlement(): Promise<FreeServiceEntitlement> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return EMPTY_ENTITLEMENT;

  const client = supabase as unknown as {
    rpc: (
      name: "get_my_free_service_entitlement",
    ) => Promise<{ data: unknown; error: unknown | null }>;
  };
  const { data, error } = await client.rpc("get_my_free_service_entitlement");
  if (error) throw error;
  if (!data || typeof data !== "object") return EMPTY_ENTITLEMENT;
  return { ...EMPTY_ENTITLEMENT, ...(data as Partial<FreeServiceEntitlement>) };
}

export function isActiveFreeServiceEntitlement(
  entitlement: FreeServiceEntitlement | null | undefined,
): boolean {
  if (!entitlement?.active || entitlement.offer_code !== "free_year_local_service") return false;
  if (!entitlement.founder_end) return true;
  return new Date(entitlement.founder_end).getTime() > Date.now();
}

export function founderProfileDestination(searchParams: URLSearchParams): string {
  const output = new URLSearchParams();
  output.set("source", "founder_free");
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "ref", "p", "prospect"]) {
    const value = searchParams.get(key);
    if (value) output.set(key, value);
  }
  return `/entrepreneurs/profil?${output.toString()}`;
}

export function postMatchingProfileDestination(
  entitlement: FreeServiceEntitlement | null | undefined,
): string {
  return isActiveFreeServiceEntitlement(entitlement)
    ? "/calendar/connect?role=contractor&surface=founder_free_profile"
    : "/entrepreneur/devis-personnalise";
}
