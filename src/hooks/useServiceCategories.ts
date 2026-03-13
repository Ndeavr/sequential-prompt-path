import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceCategory {
  id: string;
  slug: string;
  name_fr: string;
  name_en: string | null;
  description_fr: string | null;
  icon_name: string | null;
  sort_order: number;
  is_active: boolean;
  requires_admin_approval: boolean;
  parent_id: string | null;
  ai_keywords: string[] | null;
  children?: ServiceCategory[];
}

export function useServiceCategories() {
  return useQuery({
    queryKey: ["service-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_categories")
        .select("id, slug, name, name_fr, name_en, description_fr, icon_name, sort_order, is_active, requires_admin_approval, parent_id, ai_keywords")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;

      // Build tree
      const all = (data || []).map((d: any) => ({
        ...d,
        name_fr: d.name_fr || d.name || d.slug,
      })) as ServiceCategory[];

      const roots = all.filter((c) => !c.parent_id);
      const childMap = new Map<string, ServiceCategory[]>();
      for (const c of all) {
        if (c.parent_id) {
          const arr = childMap.get(c.parent_id) || [];
          arr.push(c);
          childMap.set(c.parent_id, arr);
        }
      }
      for (const root of roots) {
        root.children = childMap.get(root.id) || [];
      }

      return { roots, all };
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useContractorCategoryAssignments(contractorId: string | null) {
  return useQuery({
    queryKey: ["contractor-category-assignments", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractor_category_assignments" as any)
        .select("*, service_categories:category_id(id, slug, name_fr, name, parent_id, requires_admin_approval)")
        .eq("contractor_id", contractorId!);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!contractorId,
  });
}
