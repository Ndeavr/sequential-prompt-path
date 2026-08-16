/**
 * UNPRO — Property Story (Passeport Maison)
 *
 * Read-only unified feed of everything that documents the life of a property.
 * Merges existing sources — no new storage, no fabricated data:
 *   property_events · property_documents · pim_warranties
 *   pim_inspections · pim_maintenance_history
 *
 * Any field that is unknown is simply absent — never invented.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProvenanceKind } from "@/lib/copy/passportPositioning";

export type StoryCategory =
  | "inspection"
  | "maintenance"
  | "repair"
  | "renovation"
  | "upgrade"
  | "warranty"
  | "document"
  | "other";

export interface StoryEntry {
  id: string;
  source: "event" | "document" | "warranty" | "inspection" | "maintenance";
  category: StoryCategory;
  title: string;
  description?: string | null;
  date?: string | null;
  year: number | null;
  cost?: number | null;
  contractorId?: string | null;
  provider?: string | null;
  provenance: ProvenanceKind;
  documentType?: string | null;
  warrantyEndDate?: string | null;
  storagePath?: string | null;
  hasFile: boolean;
}

const CATEGORY_FROM_EVENT: Record<string, StoryCategory> = {
  inspection: "inspection",
  maintenance: "maintenance",
  repair: "repair",
  renovation: "renovation",
  upgrade: "upgrade",
};

const CATEGORY_FROM_DOC: Record<string, StoryCategory> = {
  inspection: "inspection",
  warranty: "warranty",
  invoice: "document",
  quote: "document",
  permit: "document",
  tax_bill: "document",
  photo: "document",
};

function yearOf(date?: string | null): number | null {
  if (!date) return null;
  const y = new Date(date).getFullYear();
  return Number.isFinite(y) ? y : null;
}

export interface PropertyStory {
  entries: StoryEntry[];
  byYear: Array<{ year: number | null; entries: StoryEntry[] }>;
  counts: {
    total: number;
    events: number;
    documents: number;
    warranties: number;
    verified: number;
  };
}

export function usePropertyStory(propertyId: string | undefined) {
  return useQuery({
    queryKey: ["property-story", propertyId],
    enabled: !!propertyId,
    queryFn: async (): Promise<PropertyStory> => {
      const id = propertyId!;
      const [eventsRes, docsRes, warrantiesRes, inspectionsRes, maintenanceRes] = await Promise.all([
        supabase.from("property_events").select("*").eq("property_id", id),
        supabase.from("property_documents").select("*").eq("property_id", id),
        supabase.from("pim_warranties").select("*").eq("property_id", id),
        supabase.from("pim_inspections").select("*").eq("property_id", id),
        supabase.from("pim_maintenance_history").select("*").eq("property_id", id),
      ]);

      const entries: StoryEntry[] = [];

      for (const e of eventsRes.data ?? []) {
        const row = e as Record<string, any>;
        entries.push({
          id: `event:${row.id}`,
          source: "event",
          category: CATEGORY_FROM_EVENT[row.event_type] ?? "other",
          title: row.title,
          description: row.description,
          date: row.event_date ?? row.created_at,
          year: yearOf(row.event_date ?? row.created_at),
          cost: row.cost,
          contractorId: row.contractor_id,
          provenance: (row.provenance as ProvenanceKind) ?? "declared",
          hasFile: false,
        });
      }

      for (const d of docsRes.data ?? []) {
        const row = d as Record<string, any>;
        entries.push({
          id: `document:${row.id}`,
          source: "document",
          category: CATEGORY_FROM_DOC[row.document_type] ?? "document",
          title: row.title,
          description: row.notes,
          date: row.created_at,
          year: yearOf(row.created_at),
          provenance: row.storage_path || row.file_url ? "verified" : "declared",
          documentType: row.document_type,
          storagePath: row.storage_path,
          hasFile: !!(row.storage_path || row.file_url),
        });
      }

      for (const w of warrantiesRes.data ?? []) {
        const row = w as Record<string, any>;
        if (!row.item && !row.provider) continue;
        entries.push({
          id: `warranty:${row.id}`,
          source: "warranty",
          category: "warranty",
          title: row.item || `Garantie — ${row.provider}`,
          date: row.start_date ?? row.created_at,
          year: yearOf(row.start_date ?? row.created_at),
          provider: row.provider,
          warrantyEndDate: row.end_date,
          provenance: "declared",
          hasFile: false,
        });
      }

      for (const i of inspectionsRes.data ?? []) {
        const row = i as Record<string, any>;
        entries.push({
          id: `inspection:${row.id}`,
          source: "inspection",
          category: "inspection",
          title: row.inspector_name ? `Inspection — ${row.inspector_name}` : "Inspection",
          description: row.summary,
          date: row.inspection_date ?? row.created_at,
          year: yearOf(row.inspection_date ?? row.created_at),
          provenance: "declared",
          hasFile: false,
        });
      }

      for (const m of maintenanceRes.data ?? []) {
        const row = m as Record<string, any>;
        if (!row.task) continue;
        entries.push({
          id: `maintenance:${row.id}`,
          source: "maintenance",
          category: "maintenance",
          title: row.task,
          date: row.performed_at ?? row.created_at,
          year: yearOf(row.performed_at ?? row.created_at),
          provenance: "declared",
          hasFile: false,
        });
      }

      entries.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });

      const yearMap = new Map<number | null, StoryEntry[]>();
      for (const entry of entries) {
        const list = yearMap.get(entry.year) ?? [];
        list.push(entry);
        yearMap.set(entry.year, list);
      }

      const byYear = Array.from(yearMap.entries())
        .map(([year, list]) => ({ year, entries: list }))
        .sort((a, b) => (b.year ?? -1) - (a.year ?? -1));

      return {
        entries,
        byYear,
        counts: {
          total: entries.length,
          events: entries.filter((e) => e.source === "event").length,
          documents: entries.filter((e) => e.source === "document").length,
          warranties: entries.filter((e) => e.category === "warranty").length,
          verified: entries.filter((e) => e.provenance === "verified").length,
        },
      };
    },
  });
}
