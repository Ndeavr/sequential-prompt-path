import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SignaturePartner {
  id: string;
  slug: string;
  legal_name: string | null;
  display_name: string;
  tagline: string | null;
  source_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  brand: Record<string, any>;
  services: Array<{ name: string; slug?: string; description?: string }>;
  coverage: string[];
  certifications: Array<{ label: string; verified?: boolean }>;
  media: Record<string, any>;
  reviews_summary: Record<string, any>;
  enriched_at: string | null;
  tier: string;
}

export interface AvailabilityDay {
  date: string;
  slots: string[];
}

export function useSignaturePartner(slug: string) {
  return useQuery({
    queryKey: ["signature-partner", slug],
    queryFn: async (): Promise<SignaturePartner | null> => {
      const { data, error } = await supabase
        .from("signature_partners")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function usePartnerAvailability(partnerId?: string) {
  return useQuery({
    enabled: !!partnerId,
    queryKey: ["partner-availability", partnerId],
    queryFn: async (): Promise<AvailabilityDay[]> => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("partner_calendar_availability")
        .select("date, slots")
        .eq("partner_id", partnerId!)
        .gte("date", today)
        .order("date")
        .limit(30);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ date: r.date, slots: r.slots ?? [] }));
    },
  });
}
