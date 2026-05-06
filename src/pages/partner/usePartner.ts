import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Partner {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  company: string | null;
  partner_status: string;
  partner_tier: string;
  referral_code: string | null;
  annual_new_contractors_target: number;
  commission_rate_first_24_months: number;
  commission_rate_lifetime: number;
}

export function usePartner() {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!user?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from("partners" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancel) { setPartner((data as any) ?? null); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [user?.id]);

  return { partner, loading };
}
