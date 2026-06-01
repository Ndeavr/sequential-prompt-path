import { supabase } from "@/integrations/supabase/client";

export type ImportRunStatus = "draft" | "crawling" | "enriching" | "scoring" | "completed" | "failed";

export interface ImportRun {
  id: string;
  domain: string | null;
  status: ImportRunStatus;
  current_stage: string | null;
  progress: number;
  stages: Array<{ key: string; label: string; status: string; data?: any; at: string }>;
  error: string | null;
}

export interface ImportAssets {
  id: string;
  run_id: string;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  description: string | null;
  rbq_number: string | null;
  neq_number: string | null;
  years_in_business: number | null;
  logo_url: string | null;
  favicon_url: string | null;
  hero_image_url: string | null;
  gallery: string[];
  social_links: Record<string, string>;
  certifications: string[];
  services: string[];
  service_cities: string[];
  testimonials: Array<{ author?: string; text?: string }>;
  trust_badges: string[];
  financing_mentioned: boolean;
  emergency_mentioned: boolean;
}

export interface ImportScores {
  seo_score: number;
  trust_score: number;
  social_score: number;
  conversion_score: number;
  completeness_score: number;
  aeo_score: number;
  overall_score: number;
  quick_wins: string[];
  ai_summary: string | null;
}

export async function startImport(input: {
  website_url?: string;
  business_name?: string;
  city?: string;
}): Promise<{ run_id: string }> {
  const { data, error } = await supabase.functions.invoke("import-business-intelligence", { body: input });
  if (error) throw error;
  return data;
}

export async function getRun(runId: string): Promise<ImportRun | null> {
  const { data } = await supabase.from("contractor_import_runs").select("*").eq("id", runId).maybeSingle();
  return data as any;
}

export async function getAssets(runId: string): Promise<ImportAssets | null> {
  const { data } = await supabase.from("contractor_import_assets").select("*").eq("run_id", runId).maybeSingle();
  return data as any;
}

export async function getScores(runId: string): Promise<ImportScores | null> {
  const { data } = await supabase.from("contractor_import_scores").select("*").eq("run_id", runId).maybeSingle();
  return data as any;
}

export function subscribeToRun(
  runId: string,
  onUpdate: (payload: { run?: ImportRun; assets?: ImportAssets; scores?: ImportScores }) => void
) {
  const channel = supabase
    .channel(`import:${runId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "contractor_import_runs", filter: `id=eq.${runId}` },
      (p) => onUpdate({ run: p.new as any }))
    .on("postgres_changes", { event: "*", schema: "public", table: "contractor_import_assets", filter: `run_id=eq.${runId}` },
      (p) => onUpdate({ assets: p.new as any }))
    .on("postgres_changes", { event: "*", schema: "public", table: "contractor_import_scores", filter: `run_id=eq.${runId}` },
      (p) => onUpdate({ scores: p.new as any }))
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
