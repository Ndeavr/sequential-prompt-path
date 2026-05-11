import AppointmentUpsellCard from "@/components/goals/AppointmentUpsellCard";
import type { PackTier } from "@/lib/appointmentPricing";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  selectedPackId: string | null;
  onSelect: (packId: string | null) => void;
  /** Optional context to make pricing intelligent. */
  tradeSlug?: string;
  citySlug?: string;
}

/**
 * Lead-pack selector. Replaces the legacy DB-driven flat list with the
 * dynamic, industry-aware appointment pricing engine. The selected `id`
 * is encoded as the tier size so downstream consumers (checkout) can
 * reconstruct the pack without an extra DB roundtrip.
 */
export default function PanelLeadPackSelector({
  selectedPackId,
  onSelect,
  tradeSlug: tradeProp,
  citySlug: cityProp,
}: Props) {
  const [trade, setTrade] = useState<string>(tradeProp ?? "default");
  const [city, setCity] = useState<string>(cityProp ?? "");

  // Best-effort: pull contractor's industry/city from current session.
  useEffect(() => {
    if (tradeProp && cityProp) return;
    let active = true;
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const uid = auth.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from("contractors")
          .select("specialty, city")
          .eq("user_id", uid)
          .maybeSingle();
        if (!active || !data) return;
        if (!tradeProp && data.primary_category) {
          setTrade(String(data.primary_category).toLowerCase().replace(/\s+/g, "-"));
        }
        if (!cityProp && data.city) {
          setCity(String(data.city).toLowerCase().replace(/\s+/g, "-"));
        }
      } catch {
        /* silent */
      }
    })();
    return () => { active = false; };
  }, [tradeProp, cityProp]);

  const selectedTier: PackTier | null = (() => {
    if (!selectedPackId) return null;
    const size = parseInt(selectedPackId, 10);
    if (!Number.isFinite(size)) return null;
    return { size } as PackTier; // size match is enough for AppointmentUpsellCard
  })();

  return (
    <AppointmentUpsellCard
      tradeSlug={trade}
      citySlug={city}
      selectedPack={selectedTier}
      onSelectPack={(pack) => onSelect(pack ? String(pack.size) : null)}
    />
  );
}
