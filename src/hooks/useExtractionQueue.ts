import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export function useExtractionQueue(filters: {
  search: string;
  status: string;
  cityId: string;
  domainId: string;
}) {
  return useQuery({
    queryKey: ["extraction-queue", filters],
    queryFn: async () => {
      let q = supabase
        .from("companies")
        .select(`
          id, legal_name, display_name, neq_number, rbq_number,
          website, primary_email, primary_phone, status, verification_status,
          city_id, domain_id, created_at,
          cities(name), service_domains(name)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.cityId !== "all") q = q.eq("city_id", filters.cityId);
      if (filters.domainId !== "all") q = q.eq("domain_id", filters.domainId);
      if (filters.search) {
        q = q.or(`legal_name.ilike.%${filters.search}%,display_name.ilike.%${filters.search}%,neq_number.ilike.%${filters.search}%,primary_phone.ilike.%${filters.search}%,website.ilike.%${filters.search}%`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        ...c,
        city_name: c.cities?.name,
        domain_name: c.service_domains?.name,
      }));
    },
  });
}

export function useExtractionStats() {
  return useQuery({
    queryKey: ["extraction-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("status");
      if (error) throw error;
      const total = data?.length ?? 0;
      const approved = data?.filter((c: any) => c.status === "approved").length ?? 0;
      const pending = data?.filter((c: any) => c.status === "pending_review").length ?? 0;
      const rejected = data?.filter((c: any) => c.status === "rejected").length ?? 0;
      return { total, approved, pending, rejected };
    },
  });
}

export function useCompanySourceFields(companyId: string | null) {
  return useQuery({
    queryKey: ["company-source-fields", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_source_fields")
        .select("*, source_connectors(source_name)")
        .eq("company_id", companyId!)
        .order("field_name");
      if (error) throw error;
      return (data ?? []).map((f: any) => ({
        ...f,
        source_name: f.source_connectors?.source_name ?? "Inconnu",
      }));
    },
  });
}

export function useCompanyActions() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const approve = useMutation({
    mutationFn: async (companyId: string) => {
      const { data, error } = await supabase.rpc("approve_company", {
        _company_id: companyId,
        _actor_id: session?.user?.id ?? "",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Entreprise approuvée");
      qc.invalidateQueries({ queryKey: ["extraction-queue"] });
      qc.invalidateQueries({ queryKey: ["extraction-stats"] });
    },
    onError: () => toast.error("Erreur lors de l'approbation"),
  });

  const reject = useMutation({
    mutationFn: async ({ companyId, notes }: { companyId: string; notes: string }) => {
      const { data, error } = await supabase.rpc("reject_company", {
        _company_id: companyId,
        _actor_id: session?.user?.id ?? "",
        _notes: notes || null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Entreprise rejetée");
      qc.invalidateQueries({ queryKey: ["extraction-queue"] });
      qc.invalidateQueries({ queryKey: ["extraction-stats"] });
    },
    onError: () => toast.error("Erreur lors du rejet"),
  });

  return { approve, reject };
}

export function useCitiesList() {
  return useQuery({
    queryKey: ["cities-list"],
    queryFn: async () => {
      const { data } = await supabase.from("cities").select("id, name").eq("is_active", true).order("name").limit(500);
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export function useServiceDomainsList() {
  return useQuery({
    queryKey: ["service-domains-list"],
    queryFn: async () => {
      const { data } = await supabase.from("service_domains").select("id, name").eq("is_active", true).order("name");
      return data ?? [];
    },
    staleTime: 300_000,
  });
}

export function useSourceConnectors() {
  return useQuery({
    queryKey: ["source-connectors"],
    queryFn: async () => {
      const { data } = await supabase.from("source_connectors").select("*").order("source_name");
      return data ?? [];
    },
    staleTime: 60_000,
  });
}
