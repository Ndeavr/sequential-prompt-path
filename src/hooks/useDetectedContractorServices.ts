/**
 * UNPRO — Services réellement détectés pour une entreprise.
 * Lecture seule. Aucune donnée inventée : si rien n'est détecté, le tableau est vide.
 * Provenances possibles : verified > google > website > declared.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ServiceSource = "verified" | "google" | "website" | "declared";

export interface DetectedService {
  slug: string;
  label: string;
  source: ServiceSource;
  is_primary: boolean;
}

const SOURCE_RANK: Record<ServiceSource, number> = {
  verified: 4,
  google: 3,
  website: 2,
  declared: 1,
};

export function serviceSlug(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function normalizeSource(raw: unknown): ServiceSource {
  const v = String(raw ?? "").toLowerCase();
  if (v.includes("verif") || v.includes("rbq") || v.includes("confirm")) return "verified";
  if (v.includes("google") || v.includes("gmb") || v.includes("maps")) return "google";
  if (v.includes("web") || v.includes("site") || v.includes("crawl") || v.includes("firecrawl")) return "website";
  return "declared";
}

/** Dédoublonnage par slug : la provenance la plus forte gagne, `is_primary` est conservé. */
export function dedupeDetected(items: DetectedService[]): DetectedService[] {
  const map = new Map<string, DetectedService>();
  for (const item of items) {
    if (!item.slug || !item.label) continue;
    const prev = map.get(item.slug);
    if (!prev) {
      map.set(item.slug, item);
      continue;
    }
    map.set(item.slug, {
      slug: item.slug,
      label: prev.label.length >= item.label.length ? prev.label : item.label,
      source: SOURCE_RANK[item.source] > SOURCE_RANK[prev.source] ? item.source : prev.source,
      is_primary: prev.is_primary || item.is_primary,
    });
  }
  return Array.from(map.values()).sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.label.localeCompare(b.label, "fr"),
  );
}

export function useDetectedContractorServices(contractorId: string | null) {
  return useQuery({
    queryKey: ["detected-contractor-services", contractorId],
    enabled: !!contractorId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<DetectedService[]> => {
      const cid = contractorId!;
      const [services, capabilities, aippProfile, entity] = await Promise.all([
        supabase
          .from("contractor_services")
          .select("service_name_fr, data_source, is_primary, is_active")
          .eq("contractor_id", cid),
        supabase
          .from("contractor_capabilities")
          .select("service_slug, category_slug, source, is_active")
          .eq("contractor_id", cid),
        supabase.from("aipp_profiles").select("id").eq("contractor_id", cid).maybeSingle(),
        supabase.from("ai_entities").select("id").eq("contractor_id", cid).maybeSingle(),
      ]);

      const out: DetectedService[] = [];

      for (const row of services.data ?? []) {
        const r = row as any;
        if (r.is_active === false || !r.service_name_fr) continue;
        out.push({
          slug: serviceSlug(r.service_name_fr),
          label: r.service_name_fr,
          source: normalizeSource(r.data_source),
          is_primary: r.is_primary === true,
        });
      }

      for (const row of capabilities.data ?? []) {
        const r = row as any;
        const raw = r.service_slug || r.category_slug;
        if (r.is_active === false || !raw) continue;
        out.push({
          slug: serviceSlug(raw),
          label: String(raw).replace(/[-_]+/g, " "),
          source: normalizeSource(r.source),
          is_primary: false,
        });
      }

      if (aippProfile.data?.id) {
        const { data } = await supabase
          .from("aipp_profile_services")
          .select("service_name, sub_services, is_primary")
          .eq("profile_id", aippProfile.data.id);
        for (const row of data ?? []) {
          const r = row as any;
          if (r.service_name) {
            out.push({
              slug: serviceSlug(r.service_name),
              label: r.service_name,
              source: "website",
              is_primary: r.is_primary === true,
            });
          }
          for (const sub of (r.sub_services ?? []) as string[]) {
            if (!sub) continue;
            out.push({ slug: serviceSlug(sub), label: sub, source: "website", is_primary: false });
          }
        }
      }

      if (entity.data?.id) {
        const { data } = await supabase
          .from("ai_entity_services")
          .select("label, slug, sort_order")
          .eq("entity_id", entity.data.id);
        for (const row of data ?? []) {
          const r = row as any;
          if (!r.label) continue;
          out.push({
            slug: serviceSlug(r.slug || r.label),
            label: r.label,
            source: "google",
            is_primary: r.sort_order === 0,
          });
        }
      }

      return dedupeDetected(out);
    },
  });
}
