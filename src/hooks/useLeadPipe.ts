/**
 * UNPRO — Lead Pipe hooks (city profile, analysis, plumber lead, page tracking)
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LeadPipeCityProfile {
  id: string;
  city: string;
  city_slug: string;
  region: string | null;
  population: number | null;
  risk_index: number;
  avg_build_year: number | null;
  pre_1950_share: number | null;
  pre_1975_share: number | null;
  public_lead_service_estimated: boolean;
  hero_summary: string | null;
  faq: any;
  recommended_actions: any;
}

export const useLeadPipeCityProfile = (citySlug?: string) =>
  useQuery({
    queryKey: ["lead-pipe-city", citySlug],
    enabled: !!citySlug,
    queryFn: async () => {
      const { data, error } = await (supabase.from("lead_pipe_city_profiles") as any)
        .select("*")
        .eq("city_slug", citySlug)
        .maybeSingle();
      if (error) throw error;
      return data as LeadPipeCityProfile | null;
    },
  });

export const useLeadPipeNeighborhoods = (citySlug?: string) =>
  useQuery({
    queryKey: ["lead-pipe-neighborhoods", citySlug],
    enabled: !!citySlug,
    queryFn: async () => {
      const { data, error } = await (supabase.from("lead_pipe_neighborhood_profiles") as any)
        .select("*")
        .eq("city_slug", citySlug)
        .order("risk_index", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const useTopLeadPipeCities = (limit = 12) =>
  useQuery({
    queryKey: ["lead-pipe-top-cities", limit],
    queryFn: async () => {
      const { data, error } = await (supabase.from("lead_pipe_city_profiles") as any)
        .select("city, city_slug, region, risk_index")
        .eq("active", true)
        .order("risk_index", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });

export const useAnalyzeLeadPipe = () =>
  useMutation({
    mutationFn: async (vars: { propertyId: string; neighborhood?: string | null }) => {
      const { data, error } = await supabase.functions.invoke("lead-pipe-analyze", {
        body: vars,
      });
      if (error) throw error;
      return data;
    },
  });

export const useCreatePlumberLead = () =>
  useMutation({
    mutationFn: async (vars: {
      propertyId?: string | null;
      propertyLeadScoreId?: string | null;
      city?: string | null;
      citySlug?: string | null;
      category?: string;
      urgency?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      notes?: string;
    }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await (supabase.from("plumber_leads") as any)
        .insert({
          user_id: userRes?.user?.id ?? null,
          property_id: vars.propertyId ?? null,
          property_lead_score_id: vars.propertyLeadScoreId ?? null,
          city: vars.city,
          city_slug: vars.citySlug,
          category: vars.category ?? "lead_pipe_inspection",
          urgency: vars.urgency ?? "normal",
          contact_name: vars.contactName,
          contact_phone: vars.contactPhone,
          contact_email: vars.contactEmail,
          notes: vars.notes,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  });

export async function trackLeadPipeEvent(args: {
  citySlug: string;
  slug: string;
  event: string;
  utm?: Record<string, any>;
}) {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    await (supabase.from("lead_pipe_page_views") as any).insert({
      city_slug: args.citySlug,
      slug: args.slug,
      path: typeof window !== "undefined" ? window.location.pathname : "",
      session_id: typeof window !== "undefined" ? window.sessionStorage.getItem("unpro_sid") : null,
      user_id: userRes?.user?.id ?? null,
      event: args.event,
      utm: args.utm ?? {},
      referrer: typeof document !== "undefined" ? document.referrer : null,
    });
  } catch {
    /* silent */
  }
}
