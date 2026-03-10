import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useProperty } from "./useProperties";
import { calculateHomeScore, type HomeScoreInput } from "@/services/homeScoreService";
import { generatePropertyInsights } from "@/services/propertyInsightService";

/**
 * Computes a live Home Score from property data + related counts.
 */
export const useComputedHomeScore = (propertyId?: string) => {
  const { user } = useAuth();
  const { data: property } = useProperty(propertyId);

  return useQuery({
    queryKey: ["computed-home-score", propertyId],
    queryFn: async () => {
      if (!property || !user) return null;

      // Gather counts
      const [docRes, quoteRes, eventRes, inspectionRes] = await Promise.all([
        supabase.from("storage_documents").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("entity_id", propertyId!),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("property_id", propertyId!),
        supabase.from("property_events").select("id, event_type", { count: "exact" }).eq("property_id", propertyId!),
        supabase.from("storage_documents").select("id", { count: "exact", head: true }).eq("entity_id", propertyId!).eq("bucket", "inspection-reports"),
      ]);

      const renovationCount = eventRes.data?.filter(e => e.event_type === "renovation").length ?? 0;
      const repairCount = eventRes.data?.filter(e => e.event_type === "repair").length ?? 0;

      const input: HomeScoreInput = {
        yearBuilt: property.year_built,
        propertyType: property.property_type,
        squareFootage: property.square_footage,
        condition: property.condition,
        hasInspectionReports: (inspectionRes.count ?? 0) > 0,
        uploadedDocumentCount: docRes.count ?? 0,
        quoteCount: quoteRes.count ?? 0,
        renovationCount,
        recentRepairCount: repairCount,
      };

      return calculateHomeScore(input);
    },
    enabled: !!property && !!user?.id,
  });
};

/**
 * Generates deterministic insights for a property.
 */
export const useComputedInsights = (propertyId?: string) => {
  const { user } = useAuth();
  const { data: property } = useProperty(propertyId);

  return useQuery({
    queryKey: ["computed-insights", propertyId],
    queryFn: async () => {
      if (!property || !user) return [];

      const [eventRes, inspectionRes, quoteRes] = await Promise.all([
        supabase.from("property_events").select("id, event_type").eq("property_id", propertyId!),
        supabase.from("storage_documents").select("id", { count: "exact", head: true }).eq("entity_id", propertyId!).eq("bucket", "inspection-reports"),
        supabase.from("quotes").select("id", { count: "exact", head: true }).eq("property_id", propertyId!),
      ]);

      return generatePropertyInsights({
        yearBuilt: property.year_built,
        propertyType: property.property_type,
        condition: property.condition,
        squareFootage: property.square_footage,
        renovationCount: eventRes.data?.filter(e => e.event_type === "renovation").length ?? 0,
        hasInspectionReports: (inspectionRes.count ?? 0) > 0,
        quoteCount: quoteRes.count ?? 0,
      });
    },
    enabled: !!property && !!user?.id,
  });
};

/**
 * Save insights to property_insights table.
 */
export const useSaveInsights = () => {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ propertyId, insights }: { propertyId: string; insights: Array<{ type: string; title: string; description?: string; urgency?: string; contractorCategory?: string }> }) => {
      // Delete old insights for this property
      await supabase.from("property_insights" as any).delete().eq("property_id", propertyId).eq("user_id", user!.id);

      if (!insights.length) return [];

      const rows = insights.map(i => ({
        property_id: propertyId,
        user_id: user!.id,
        type: i.type,
        title: i.title,
        description: i.description ?? null,
        urgency: i.urgency ?? "medium",
        contractor_category: i.contractorCategory ?? null,
      }));

      const { data, error } = await supabase.from("property_insights" as any).insert(rows).select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["property-insights"] }),
  });
};
