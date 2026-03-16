/**
 * UNPRO — Home Problem Graph Service
 * Queries for the knowledge graph, blueprints, and stats.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────

export interface GraphProblem {
  id: string;
  slug: string;
  name_fr: string;
  severity_level: string | null;
  demand_score: number | null;
  profitability_score: number | null;
  seo_priority_score: number | null;
  total_priority_score: number | null;
  is_active: boolean;
  symptom_count?: number;
  cause_count?: number;
  solution_count?: number;
  profession_count?: number;
  geo_count?: number;
}

export interface GraphBlueprint {
  id: string;
  blueprint_type: string;
  canonical_slug: string;
  title_fr: string | null;
  meta_title_fr: string | null;
  priority_score: number;
  generation_status: string;
  generation_reason: string | null;
  created_at: string;
  problem?: { slug: string; name_fr: string } | null;
  geo_area?: { slug: string; name_fr: string; area_type: string } | null;
}

export interface GraphStats {
  problems: number;
  symptoms: number;
  causes: number;
  solutions: number;
  professions: number;
  valueTags: number;
  geoAreas: number;
  questions: number;
  blueprints: number;
  blueprintsPublished: number;
  blueprintsPending: number;
  blueprintsQueued: number;
}

// ─── Fetch helpers ───────────────────────────────────────────────

export async function fetchGraphStats(): Promise<GraphStats> {
  const [
    problems, symptoms, causes, solutions, professions,
    valueTags, geoAreas, questions, blueprints,
    blueprintsPublished, blueprintsPending, blueprintsQueued,
  ] = await Promise.all([
    supabase.from("home_problems").select("id", { count: "exact", head: true }),
    supabase.from("problem_symptoms").select("id", { count: "exact", head: true }),
    supabase.from("problem_causes").select("id", { count: "exact", head: true }),
    supabase.from("home_solutions").select("id", { count: "exact", head: true }),
    supabase.from("home_professions").select("id", { count: "exact", head: true }),
    supabase.from("value_tags").select("id", { count: "exact", head: true }),
    supabase.from("geo_areas").select("id", { count: "exact", head: true }),
    supabase.from("homeowner_questions").select("id", { count: "exact", head: true }),
    supabase.from("graph_page_blueprints").select("id", { count: "exact", head: true }),
    supabase.from("graph_page_blueprints").select("id", { count: "exact", head: true }).eq("generation_status", "published"),
    supabase.from("graph_page_blueprints").select("id", { count: "exact", head: true }).eq("generation_status", "pending"),
    supabase.from("graph_page_blueprints").select("id", { count: "exact", head: true }).eq("generation_status", "queued"),
  ]);

  return {
    problems: problems.count ?? 0,
    symptoms: symptoms.count ?? 0,
    causes: causes.count ?? 0,
    solutions: solutions.count ?? 0,
    professions: professions.count ?? 0,
    valueTags: valueTags.count ?? 0,
    geoAreas: geoAreas.count ?? 0,
    questions: questions.count ?? 0,
    blueprints: blueprints.count ?? 0,
    blueprintsPublished: blueprintsPublished.count ?? 0,
    blueprintsPending: blueprintsPending.count ?? 0,
    blueprintsQueued: blueprintsQueued.count ?? 0,
  };
}

export async function fetchGraphProblems(limit = 200): Promise<GraphProblem[]> {
  const { data, error } = await supabase
    .from("home_problems")
    .select("id, slug, name_fr, severity_level, demand_score, profitability_score, seo_priority_score, total_priority_score, is_active")
    .order("total_priority_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as GraphProblem[];
}

export async function fetchBlueprints(
  limit = 200,
  statusFilter?: string,
  typeFilter?: string
): Promise<GraphBlueprint[]> {
  let q = supabase
    .from("graph_page_blueprints")
    .select("id, blueprint_type, canonical_slug, title_fr, meta_title_fr, priority_score, generation_status, generation_reason, created_at, problem:home_problems(slug, name_fr), geo_area:geo_areas(slug, name_fr, area_type)")
    .order("priority_score", { ascending: false })
    .limit(limit);
  if (statusFilter && statusFilter !== "all") q = q.eq("generation_status", statusFilter);
  if (typeFilter && typeFilter !== "all") q = q.eq("blueprint_type", typeFilter);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as GraphBlueprint[];
}

export async function fetchQuickWins(limit = 20): Promise<GraphBlueprint[]> {
  const { data, error } = await supabase
    .from("graph_page_blueprints")
    .select("id, blueprint_type, canonical_slug, title_fr, priority_score, generation_status, generation_reason, created_at")
    .eq("generation_status", "pending")
    .order("priority_score", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as GraphBlueprint[];
}

export async function fetchQualityIssues(): Promise<{
  problemsWithoutSolutions: number;
  solutionsWithoutProfessions: number;
  problemsWithoutGeo: number;
  duplicateBlueprints: number;
}> {
  // Problems without solution edges
  const { data: allProblems } = await supabase.from("home_problems").select("id");
  const { data: linkedProblems } = await supabase.from("home_problem_solution_edges").select("problem_id");

  const linkedSet = new Set((linkedProblems ?? []).map((l: any) => l.problem_id));
  const problemsWithoutSolutions = (allProblems ?? []).filter((p: any) => !linkedSet.has(p.id)).length;

  // Solutions without profession edges
  const { data: allSolutions } = await supabase.from("home_solutions").select("id");
  const { data: linkedSolutions } = await supabase.from("home_solution_profession_edges").select("solution_id");
  const linkedSolSet = new Set((linkedSolutions ?? []).map((l: any) => l.solution_id));
  const solutionsWithoutProfessions = (allSolutions ?? []).filter((s: any) => !linkedSolSet.has(s.id)).length;

  // Problems without geo targets
  const { data: geoLinked } = await supabase.from("problem_geo_targets").select("problem_id");
  const geoSet = new Set((geoLinked ?? []).map((g: any) => g.problem_id));
  const problemsWithoutGeo = (allProblems ?? []).filter((p: any) => !geoSet.has(p.id)).length;

  return {
    problemsWithoutSolutions,
    solutionsWithoutProfessions,
    problemsWithoutGeo,
    duplicateBlueprints: 0,
  };
}

export async function updateBlueprintStatus(id: string, status: string) {
  const { error } = await supabase
    .from("graph_page_blueprints")
    .update({ generation_status: status } as any)
    .eq("id", id);
  if (error) throw error;
}

// ─── Prompt export ───────────────────────────────────────────────

export function generateGraphPrompt(type: "problems" | "causes" | "solutions" | "faq"): string {
  const prompts: Record<string, string> = {
    problems: `# Prompt — Générer des problèmes maison pour UNPRO

## Contexte
UNPRO est une plateforme québécoise de mise en relation entre propriétaires et entrepreneurs en construction/rénovation.

## Demande
Créer 25 problèmes maison courants au Québec avec pour chacun :
- slug (kebab-case, français)
- name_fr
- short_description_fr (1 phrase)
- long_description_fr (2-3 phrases)
- severity_level: low | medium | high | critical
- demand_score: 0-100
- profitability_score: 0-100
- seo_priority_score: 0-100

## Format de sortie
JSON array d'objets.

## Contraintes
- Langue: français du Québec
- Réaliste et pertinent pour le marché québécois
- Couvrir: toiture, fondation, isolation, ventilation, plomberie, électricité, fenestration, drainage, moisissure, chauffage`,

    causes: `# Prompt — Générer des causes de problèmes maison

## Contexte
UNPRO — plateforme québécoise de rénovation.

## Demande
Créer 30 causes de problèmes maison avec :
- slug, name_fr, description_fr
- Liens vers problèmes existants (problem_slugs[])

## Format: JSON array`,

    solutions: `# Prompt — Générer des solutions de rénovation

## Contexte
UNPRO — plateforme québécoise.

## Demande
Créer 30 solutions avec :
- slug, name_fr, description_fr
- estimated_cost_min, estimated_cost_max (CAD)
- typical_duration
- Liens vers problèmes (problem_slugs[])

## Format: JSON array`,

    faq: `# Prompt — Générer des FAQ propriétaires

## Contexte
UNPRO — plateforme québécoise.

## Demande
Créer 25 questions fréquentes de propriétaires québécois avec :
- slug, question_fr, quick_answer_fr (2 phrases), full_answer_fr (paragraphe)
- cost_note_fr, urgency_note_fr
- Liens vers problèmes (problem_slugs[])

## Format: JSON array`,
  };
  return prompts[type] ?? "";
}
