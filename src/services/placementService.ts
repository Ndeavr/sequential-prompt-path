/**
 * UNPRO — QR Placement Service
 * Manages physical QR code placements and their deep link mappings.
 */
import { supabase } from "@/integrations/supabase/client";

export type PlacementType = "truck_wrap" | "condo_lobby" | "business_card" | "yard_sign" | "social_ad";

export const PLACEMENT_TYPES: { value: PlacementType; label: string; icon: string }[] = [
  { value: "truck_wrap", label: "Véhicule / Camion", icon: "Truck" },
  { value: "condo_lobby", label: "Lobby condo", icon: "Building2" },
  { value: "business_card", label: "Carte d'affaires", icon: "CreditCard" },
  { value: "yard_sign", label: "Panneau de chantier", icon: "Signpost" },
  { value: "social_ad", label: "Publicité sociale", icon: "Megaphone" },
];

export async function getUserPlacements(userId: string) {
  const { data } = await supabase
    .from("qr_placements" as any)
    .select("*, placement_deep_links(*)")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: false });
  return data || [];
}

export async function createPlacement(input: {
  name: string;
  placementType: PlacementType;
  ownerUserId: string;
  campaignId?: string;
}) {
  const { data } = await supabase.from("qr_placements" as any).insert([{
    name: input.name,
    placement_type: input.placementType,
    owner_user_id: input.ownerUserId,
    campaign_id: input.campaignId || null,
  }]).select().single();
  return data;
}

export async function linkDeepLink(placementId: string, deepLinkId: string, mode = "single") {
  return supabase.from("placement_deep_links" as any).insert([{
    placement_id: placementId,
    deep_link_id: deepLinkId,
    mode,
  }]);
}

export async function getPlacementStats(placementId: string) {
  // Get deep link IDs for this placement
  const { data: links } = await supabase
    .from("placement_deep_links" as any)
    .select("deep_link_id")
    .eq("placement_id", placementId);

  if (!links?.length) return { scans: 0, conversions: 0 };

  const dlIds = (links as any[]).map(l => l.deep_link_id).filter(Boolean);
  if (!dlIds.length) return { scans: 0, conversions: 0 };

  const [scansRes, convsRes] = await Promise.all([
    supabase.from("deep_link_events" as any).select("id", { count: "exact", head: true }).in("deep_link_id", dlIds).eq("event_type", "qr_scanned"),
    supabase.from("qualified_conversions" as any).select("id", { count: "exact", head: true }).in("deep_link_id", dlIds).eq("is_qualified", true),
  ]);

  return { scans: scansRes.count || 0, conversions: convsRes.count || 0 };
}
