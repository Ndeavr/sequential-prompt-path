/**
 * UNPRO — Massive Blueprint Generation Service
 * Combinatorial generation, scoring, wave planning, dedup, and volume simulation.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───────────────────────────────────────────────────────

export interface WavePlan {
  wave: number;
  label: string;
  blueprintCount: number;
  avgPriority: number;
  cannibalizationRisk: number; // 0-1
  estimatedCostUSD: number;
  quickWins: number;
  types: Record<string, number>;
}

export interface SimulationResult {
  totalCombinations: number;
  afterDedup: number;
  afterThreshold: number;
  waves: WavePlan[];
  dominationScores: ClusterDomination[];
  recommendation: string;
}

export interface ClusterDomination {
  cluster: string;
  totalPages: number;
  publishedPages: number;
  pendingPages: number;
  dominationPct: number;
  topProblems: string[];
}

export interface ImportValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  preview: ImportPreview;
}

export interface ImportPreview {
  problems: number;
  symptoms: number;
  causes: number;
  solutions: number;
  professions: number;
  tags: number;
  questions: number;
  relations: number;
  duplicates: number;
}

export interface ImportResult {
  success: boolean;
  inserted: ImportPreview;
  skipped: number;
  errors: string[];
  rollbackId?: string;
}

// ─── Standard UNPRO JSON Schema ─────────────────────────────────

export interface UnproGraphPayload {
  problems?: Array<{
    slug: string; name_fr: string; short_description_fr?: string; long_description_fr?: string;
    severity_level?: string; urgency_level?: string; demand_score?: number;
    profitability_score?: number; seo_priority_score?: number;
  }>;
  symptoms?: Array<{ slug: string; name_fr: string; description_fr?: string }>;
  causes?: Array<{ slug: string; name_fr: string; description_fr?: string }>;
  solutions?: Array<{
    slug: string; name_fr: string; description_fr?: string;
    estimated_cost_min?: number; estimated_cost_max?: number; typical_duration?: string;
  }>;
  professions?: Array<{ slug: string; name_fr: string; name_en?: string; description_fr?: string }>;
  tags?: Array<{ slug: string; label_fr: string; category?: string; description_fr?: string }>;
  questions?: Array<{
    slug: string; question_fr: string; quick_answer_fr?: string; full_answer_fr?: string;
    cost_note_fr?: string; urgency_note_fr?: string;
  }>;
  relations?: {
    problem_symptoms?: Array<{ problem_slug: string; symptom_slug: string; weight?: number }>;
    problem_causes?: Array<{ problem_slug: string; cause_slug: string; weight?: number }>;
    problem_solutions?: Array<{ problem_slug: string; solution_slug: string; relevance_score?: number }>;
    problem_professions?: Array<{ problem_slug: string; profession_slug: string; relevance_score?: number }>;
    problem_tags?: Array<{ problem_slug: string; tag_slug: string }>;
    problem_questions?: Array<{ problem_slug: string; question_slug: string; relevance_score?: number }>;
  };
}

// ─── Blueprint Generator ────────────────────────────────────────

const BLUEPRINT_TYPES = [
  "problem_city", "problem_profession_city", "solution_city",
  "faq_city", "profession_city", "cluster_hub",
] as const;

const COST_PER_PAGE_USD = 0.12; // AI generation cost estimate

export async function simulateMassiveGeneration(
  minPriority = 20,
  waveSizes = [500, 2000, 10000],
): Promise<SimulationResult> {
  // Fetch all entities
  const [problemsRes, geoRes, professionsRes, questionsRes, existingRes] = await Promise.all([
    supabase.from("home_problems").select("id, slug, name_fr, demand_score, profitability_score, seo_priority_score, total_priority_score, is_active").eq("is_active", true),
    supabase.from("geo_areas").select("id, slug, name_fr, area_type, population_estimate, seo_tier, is_active").eq("is_active", true),
    supabase.from("home_professions").select("id, slug, name_fr, is_active").eq("is_active", true),
    supabase.from("homeowner_questions").select("id, slug, question_fr"),
    supabase.from("graph_page_blueprints").select("canonical_slug"),
  ]);

  const problems = problemsRes.data ?? [];
  const geos = geoRes.data ?? [];
  const professions = professionsRes.data ?? [];
  const questions = questionsRes.data ?? [];
  const existingSlugs = new Set((existingRes.data ?? []).map((b: any) => b.canonical_slug));

  // Generate all combinations
  type Combo = { slug: string; type: string; priority: number; problem?: string; geo?: string };
  const combos: Combo[] = [];

  for (const p of problems) {
    for (const g of geos) {
      const slug = `${p.slug}-${g.slug}`;
      const priority = computePriority(p, g);
      combos.push({ slug, type: "problem_city", priority, problem: p.name_fr, geo: g.name_fr });

      // problem × profession × city
      for (const prof of professions) {
        const pSlug = `${prof.slug}-${p.slug}-${g.slug}`;
        combos.push({ slug: pSlug, type: "problem_profession_city", priority: priority * 0.8, problem: p.name_fr, geo: g.name_fr });
      }
    }
  }

  // solution × city (use problems as proxy for solutions count)
  for (const g of geos) {
    for (const p of problems) {
      combos.push({ slug: `solution-${p.slug}-${g.slug}`, type: "solution_city", priority: computePriority(p, g) * 0.7 });
    }
  }

  // faq × city
  for (const q of questions) {
    for (const g of geos) {
      combos.push({ slug: `${q.slug}-${g.slug}`, type: "faq_city", priority: 30 });
    }
  }

  // profession × city
  for (const prof of professions) {
    for (const g of geos) {
      combos.push({ slug: `${prof.slug}-${g.slug}`, type: "profession_city", priority: 40 });
    }
  }

  // cluster hubs per geo
  for (const g of geos) {
    combos.push({ slug: `problemes-maison-${g.slug}`, type: "cluster_hub", priority: 60 });
  }

  const totalCombinations = combos.length;

  // Dedup against existing
  const deduped = combos.filter(c => !existingSlugs.has(c.slug));
  const afterDedup = deduped.length;

  // Apply threshold
  const filtered = deduped.filter(c => c.priority >= minPriority);
  filtered.sort((a, b) => b.priority - a.priority);
  const afterThreshold = filtered.length;

  // Build waves
  const waves: WavePlan[] = [];
  let cursor = 0;
  for (let i = 0; i < waveSizes.length; i++) {
    const size = Math.min(waveSizes[i], filtered.length - cursor);
    if (size <= 0) break;
    const slice = filtered.slice(cursor, cursor + size);
    cursor += size;

    const types: Record<string, number> = {};
    let sumPriority = 0;
    let qwCount = 0;
    for (const s of slice) {
      types[s.type] = (types[s.type] ?? 0) + 1;
      sumPriority += s.priority;
      if (s.priority >= 70) qwCount++;
    }

    waves.push({
      wave: i + 1,
      label: `Vague ${i + 1}`,
      blueprintCount: slice.length,
      avgPriority: Math.round(sumPriority / slice.length),
      cannibalizationRisk: estimateCannibalization(slice),
      estimatedCostUSD: Math.round(slice.length * COST_PER_PAGE_USD * 100) / 100,
      quickWins: qwCount,
      types,
    });
  }

  // Remaining
  if (cursor < filtered.length) {
    const remaining = filtered.slice(cursor);
    const types: Record<string, number> = {};
    let sumP = 0;
    for (const r of remaining) { types[r.type] = (types[r.type] ?? 0) + 1; sumP += r.priority; }
    waves.push({
      wave: waves.length + 1,
      label: `Vague ${waves.length + 1} (reste)`,
      blueprintCount: remaining.length,
      avgPriority: Math.round(sumP / remaining.length),
      cannibalizationRisk: estimateCannibalization(remaining),
      estimatedCostUSD: Math.round(remaining.length * COST_PER_PAGE_USD * 100) / 100,
      quickWins: remaining.filter(r => r.priority >= 70).length,
      types,
    });
  }

  // Domination scores
  const dominationScores = await computeDominationScores();

  const recommendation = waves.length > 0
    ? `Lancer la vague 1 (${waves[0].blueprintCount} pages, priorité moy. ${waves[0].avgPriority}) pour un coût de ~$${waves[0].estimatedCostUSD}. ${waves[0].quickWins} quick wins inclus.`
    : "Aucun blueprint à générer avec les seuils actuels.";

  return { totalCombinations, afterDedup, afterThreshold, waves, dominationScores, recommendation };
}

function computePriority(problem: any, geo: any): number {
  const demand = problem.demand_score ?? 0;
  const profit = problem.profitability_score ?? 0;
  const seo = problem.seo_priority_score ?? 0;
  const pop = Math.min((geo.population_estimate ?? 10000) / 100000, 1) * 100;
  return Math.round(demand * 0.3 + profit * 0.25 + seo * 0.25 + pop * 0.2);
}

function estimateCannibalization(items: Array<{ slug: string; type: string }>): number {
  // Simple heuristic: high overlap of same problem across types
  const slugParts = items.map(i => i.slug.split("-")[0]);
  const counts: Record<string, number> = {};
  for (const s of slugParts) counts[s] = (counts[s] ?? 0) + 1;
  const maxOverlap = Math.max(...Object.values(counts), 1);
  return Math.min(maxOverlap / items.length * 10, 1);
}

async function computeDominationScores(): Promise<ClusterDomination[]> {
  const { data: geos } = await supabase
    .from("geo_areas").select("slug, name_fr").eq("area_type", "city").eq("is_active", true).limit(20);

  if (!geos?.length) return [];

  const results: ClusterDomination[] = [];
  for (const geo of geos) {
    const { count: total } = await supabase
      .from("graph_page_blueprints").select("id", { count: "exact", head: true })
      .ilike("canonical_slug", `%${geo.slug}%`);
    const { count: published } = await supabase
      .from("graph_page_blueprints").select("id", { count: "exact", head: true })
      .ilike("canonical_slug", `%${geo.slug}%`).eq("generation_status", "published");
    const { count: pending } = await supabase
      .from("graph_page_blueprints").select("id", { count: "exact", head: true })
      .ilike("canonical_slug", `%${geo.slug}%`).eq("generation_status", "pending");

    results.push({
      cluster: geo.name_fr,
      totalPages: total ?? 0,
      publishedPages: published ?? 0,
      pendingPages: pending ?? 0,
      dominationPct: total ? Math.round(((published ?? 0) / total) * 100) : 0,
      topProblems: [],
    });
  }

  return results.sort((a, b) => b.totalPages - a.totalPages);
}

export async function executeMassiveGeneration(
  minPriority = 20,
  waveNumber = 1,
  maxPages = 500,
): Promise<{ created: number; skipped: number }> {
  const sim = await simulateMassiveGeneration(minPriority);
  const targetWave = sim.waves.find(w => w.wave === waveNumber);
  if (!targetWave) return { created: 0, skipped: 0 };

  // Fetch needed data
  const [problemsRes, geoRes] = await Promise.all([
    supabase.from("home_problems").select("id, slug, name_fr, total_priority_score, is_active").eq("is_active", true),
    supabase.from("geo_areas").select("id, slug, name_fr, is_active").eq("is_active", true),
  ]);
  const problems = problemsRes.data ?? [];
  const geos = geoRes.data ?? [];

  // Generate problem_city combos as the primary wave
  const blueprints: any[] = [];
  for (const p of problems) {
    for (const g of geos) {
      const slug = `${p.slug}-${g.slug}`;
      const priority = p.total_priority_score ?? 0;
      if (priority < minPriority) continue;
      blueprints.push({
        blueprint_type: "problem_city",
        problem_id: p.id,
        geo_area_id: g.id,
        canonical_slug: slug,
        title_fr: `${p.name_fr} à ${g.name_fr}`,
        priority_score: priority,
        generation_status: "pending",
        generation_reason: `massive_gen_wave_${waveNumber}`,
      });
    }
  }

  // Sort and limit
  blueprints.sort((a, b) => b.priority_score - a.priority_score);
  const batch = blueprints.slice(0, maxPages);

  if (batch.length === 0) return { created: 0, skipped: 0 };

  // Upsert with conflict on canonical_slug
  const { error } = await supabase
    .from("graph_page_blueprints")
    .upsert(batch as any, { onConflict: "canonical_slug", ignoreDuplicates: true });

  if (error) throw error;

  return { created: batch.length, skipped: blueprints.length - batch.length };
}

// ─── JSON Import Pipeline ───────────────────────────────────────

export async function validateImportPayload(payload: unknown): Promise<ImportValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const preview: ImportPreview = {
    problems: 0, symptoms: 0, causes: 0, solutions: 0,
    professions: 0, tags: 0, questions: 0, relations: 0, duplicates: 0,
  };

  if (!payload || typeof payload !== "object") {
    return { valid: false, errors: ["Le payload doit être un objet JSON valide."], warnings, preview };
  }

  const p = payload as UnproGraphPayload;

  // Validate arrays
  if (p.problems) {
    if (!Array.isArray(p.problems)) errors.push("'problems' doit être un tableau.");
    else {
      preview.problems = p.problems.length;
      for (const [i, prob] of p.problems.entries()) {
        if (!prob.slug) errors.push(`problems[${i}]: slug requis.`);
        if (!prob.name_fr) errors.push(`problems[${i}]: name_fr requis.`);
      }
    }
  }
  if (p.symptoms) {
    if (!Array.isArray(p.symptoms)) errors.push("'symptoms' doit être un tableau.");
    else {
      preview.symptoms = p.symptoms.length;
      for (const [i, s] of p.symptoms.entries()) {
        if (!s.slug) errors.push(`symptoms[${i}]: slug requis.`);
        if (!s.name_fr) errors.push(`symptoms[${i}]: name_fr requis.`);
      }
    }
  }
  if (p.causes) {
    if (!Array.isArray(p.causes)) errors.push("'causes' doit être un tableau.");
    else {
      preview.causes = p.causes.length;
      for (const [i, c] of p.causes.entries()) {
        if (!c.slug) errors.push(`causes[${i}]: slug requis.`);
        if (!c.name_fr) errors.push(`causes[${i}]: name_fr requis.`);
      }
    }
  }
  if (p.solutions) {
    if (!Array.isArray(p.solutions)) errors.push("'solutions' doit être un tableau.");
    else {
      preview.solutions = p.solutions.length;
      for (const [i, s] of p.solutions.entries()) {
        if (!s.slug) errors.push(`solutions[${i}]: slug requis.`);
        if (!s.name_fr) errors.push(`solutions[${i}]: name_fr requis.`);
      }
    }
  }
  if (p.professions) {
    if (!Array.isArray(p.professions)) errors.push("'professions' doit être un tableau.");
    else { preview.professions = p.professions.length; }
  }
  if (p.tags) {
    if (!Array.isArray(p.tags)) errors.push("'tags' doit être un tableau.");
    else { preview.tags = p.tags.length; }
  }
  if (p.questions) {
    if (!Array.isArray(p.questions)) errors.push("'questions' doit être un tableau.");
    else { preview.questions = p.questions.length; }
  }

  // Count relations
  if (p.relations) {
    const rel = p.relations;
    preview.relations =
      (rel.problem_symptoms?.length ?? 0) + (rel.problem_causes?.length ?? 0) +
      (rel.problem_solutions?.length ?? 0) + (rel.problem_professions?.length ?? 0) +
      (rel.problem_tags?.length ?? 0) + (rel.problem_questions?.length ?? 0);
  }

  // Check duplicates against DB
  if (p.problems?.length) {
    const slugs = p.problems.map(x => x.slug);
    const { data: existing } = await supabase
      .from("home_problems").select("slug").in("slug", slugs);
    preview.duplicates += (existing ?? []).length;
    if ((existing ?? []).length > 0) {
      warnings.push(`${existing!.length} problème(s) déjà existant(s) — seront ignorés.`);
    }
  }

  return { valid: errors.length === 0, errors, warnings, preview };
}

export async function executeImport(payload: UnproGraphPayload): Promise<ImportResult> {
  const inserted: ImportPreview = {
    problems: 0, symptoms: 0, causes: 0, solutions: 0,
    professions: 0, tags: 0, questions: 0, relations: 0, duplicates: 0,
  };
  const errors: string[] = [];
  let skipped = 0;

  try {
    // 1. Insert problems
    if (payload.problems?.length) {
      const { data, error } = await supabase
        .from("home_problems")
        .upsert(payload.problems.map(p => ({
          slug: p.slug, name_fr: p.name_fr,
          short_description_fr: p.short_description_fr,
          long_description_fr: p.long_description_fr,
          severity_level: p.severity_level ?? "medium",
          demand_score: p.demand_score ?? 50,
          profitability_score: p.profitability_score ?? 50,
          seo_priority_score: p.seo_priority_score ?? 50,
          total_priority_score: Math.round(((p.demand_score ?? 50) + (p.profitability_score ?? 50) + (p.seo_priority_score ?? 50)) / 3),
        })) as any, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) errors.push(`Problems: ${error.message}`);
      else inserted.problems = data?.length ?? 0;
    }

    // 2. Insert symptoms
    if (payload.symptoms?.length) {
      const { data, error } = await supabase
        .from("problem_symptoms")
        .upsert(payload.symptoms.map(s => ({ slug: s.slug, name_fr: s.name_fr, description_fr: s.description_fr })) as any, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) errors.push(`Symptoms: ${error.message}`);
      else inserted.symptoms = data?.length ?? 0;
    }

    // 3. Insert causes
    if (payload.causes?.length) {
      const { data, error } = await supabase
        .from("problem_causes")
        .upsert(payload.causes.map(c => ({ slug: c.slug, name_fr: c.name_fr, description_fr: c.description_fr })) as any, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) errors.push(`Causes: ${error.message}`);
      else inserted.causes = data?.length ?? 0;
    }

    // 4. Insert solutions
    if (payload.solutions?.length) {
      const { data, error } = await supabase
        .from("home_solutions")
        .upsert(payload.solutions.map(s => ({
          slug: s.slug, name_fr: s.name_fr, description_fr: s.description_fr,
          estimated_cost_min: s.estimated_cost_min, estimated_cost_max: s.estimated_cost_max,
          typical_duration: s.typical_duration,
        })) as any, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) errors.push(`Solutions: ${error.message}`);
      else inserted.solutions = data?.length ?? 0;
    }

    // 5. Insert professions
    if (payload.professions?.length) {
      const { data, error } = await supabase
        .from("home_professions")
        .upsert(payload.professions.map(p => ({ slug: p.slug, name_fr: p.name_fr, name_en: p.name_en, description_fr: p.description_fr })) as any, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) errors.push(`Professions: ${error.message}`);
      else inserted.professions = data?.length ?? 0;
    }

    // 6. Insert tags
    if (payload.tags?.length) {
      const { data, error } = await supabase
        .from("value_tags")
        .upsert(payload.tags.map(t => ({ slug: t.slug, label_fr: t.label_fr, category: t.category, description_fr: t.description_fr })) as any, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) errors.push(`Tags: ${error.message}`);
      else inserted.tags = data?.length ?? 0;
    }

    // 7. Insert questions
    if (payload.questions?.length) {
      const { data, error } = await supabase
        .from("homeowner_questions")
        .upsert(payload.questions.map(q => ({
          slug: q.slug, question_fr: q.question_fr, quick_answer_fr: q.quick_answer_fr,
          full_answer_fr: q.full_answer_fr, cost_note_fr: q.cost_note_fr, urgency_note_fr: q.urgency_note_fr,
        })) as any, { onConflict: "slug", ignoreDuplicates: true })
        .select("id");
      if (error) errors.push(`Questions: ${error.message}`);
      else inserted.questions = data?.length ?? 0;
    }

    // 8. Insert relations (resolve slugs to ids)
    if (payload.relations) {
      const relCount = await insertRelations(payload.relations);
      inserted.relations = relCount;
    }

    skipped = inserted.duplicates;
    return { success: errors.length === 0, inserted, skipped, errors };
  } catch (e: any) {
    return { success: false, inserted, skipped, errors: [...errors, e.message] };
  }
}

async function insertRelations(relations: NonNullable<UnproGraphPayload["relations"]>): Promise<number> {
  let count = 0;

  // Resolve slug→id maps
  const [problemsRes, symptomsRes, causesRes, solutionsRes, professionsRes, tagsRes, questionsRes] = await Promise.all([
    supabase.from("home_problems").select("id, slug"),
    supabase.from("problem_symptoms").select("id, slug"),
    supabase.from("problem_causes").select("id, slug"),
    supabase.from("home_solutions").select("id, slug"),
    supabase.from("home_professions").select("id, slug"),
    supabase.from("value_tags").select("id, slug"),
    supabase.from("homeowner_questions").select("id, slug"),
  ]);

  const map = (data: any[] | null) => new Map((data ?? []).map((r: any) => [r.slug, r.id]));
  const pMap = map(problemsRes.data);
  const syMap = map(symptomsRes.data);
  const caMap = map(causesRes.data);
  const soMap = map(solutionsRes.data);
  const prMap = map(professionsRes.data);
  const tMap = map(tagsRes.data);
  const qMap = map(questionsRes.data);

  // Problem ↔ Symptom
  if (relations.problem_symptoms?.length) {
    const rows = relations.problem_symptoms
      .filter(r => pMap.has(r.problem_slug) && syMap.has(r.symptom_slug))
      .map(r => ({ problem_id: pMap.get(r.problem_slug)!, symptom_id: syMap.get(r.symptom_slug)!, weight: r.weight ?? 1 }));
    if (rows.length) {
      const { error } = await supabase.from("home_problem_symptoms").upsert(rows as any, { onConflict: "problem_id,symptom_id", ignoreDuplicates: true });
      if (!error) count += rows.length;
    }
  }

  // Problem ↔ Cause
  if (relations.problem_causes?.length) {
    const rows = relations.problem_causes
      .filter(r => pMap.has(r.problem_slug) && caMap.has(r.cause_slug))
      .map(r => ({ problem_id: pMap.get(r.problem_slug)!, cause_id: caMap.get(r.cause_slug)!, weight: r.weight ?? 1 }));
    if (rows.length) {
      const { error } = await supabase.from("home_problem_causes").upsert(rows as any, { onConflict: "problem_id,cause_id", ignoreDuplicates: true });
      if (!error) count += rows.length;
    }
  }

  // Problem ↔ Solution
  if (relations.problem_solutions?.length) {
    const rows = relations.problem_solutions
      .filter(r => pMap.has(r.problem_slug) && soMap.has(r.solution_slug))
      .map(r => ({ problem_id: pMap.get(r.problem_slug)!, solution_id: soMap.get(r.solution_slug)!, relevance_score: r.relevance_score ?? 1 }));
    if (rows.length) {
      const { error } = await supabase.from("home_problem_solution_edges").upsert(rows as any, { onConflict: "problem_id,solution_id", ignoreDuplicates: true });
      if (!error) count += rows.length;
    }
  }

  // Problem ↔ Profession
  if (relations.problem_professions?.length) {
    const rows = relations.problem_professions
      .filter(r => pMap.has(r.problem_slug) && prMap.has(r.profession_slug))
      .map(r => ({ problem_id: pMap.get(r.problem_slug)!, profession_id: prMap.get(r.profession_slug)!, relevance_score: r.relevance_score ?? 1 }));
    if (rows.length) {
      const { error } = await supabase.from("problem_professionals").upsert(rows as any, { onConflict: "problem_id,profession_id", ignoreDuplicates: true });
      if (!error) count += rows.length;
    }
  }

  // Problem ↔ Tag
  if (relations.problem_tags?.length) {
    const rows = relations.problem_tags
      .filter(r => pMap.has(r.problem_slug) && tMap.has(r.tag_slug))
      .map(r => ({ problem_id: pMap.get(r.problem_slug)!, tag_id: tMap.get(r.tag_slug)! }));
    if (rows.length) {
      const { error } = await supabase.from("home_problem_tags").upsert(rows as any, { onConflict: "problem_id,tag_id", ignoreDuplicates: true });
      if (!error) count += rows.length;
    }
  }

  // Problem ↔ Question
  if (relations.problem_questions?.length) {
    const rows = relations.problem_questions
      .filter(r => pMap.has(r.problem_slug) && qMap.has(r.question_slug))
      .map(r => ({ question_id: qMap.get(r.question_slug)!, problem_id: pMap.get(r.problem_slug)!, relevance_score: r.relevance_score ?? 1 }));
    if (rows.length) {
      const { error } = await supabase.from("question_problem_links").upsert(rows as any, { onConflict: "question_id,problem_id", ignoreDuplicates: true });
      if (!error) count += rows.length;
    }
  }

  return count;
}

export function generateImportTemplate(): string {
  const template: UnproGraphPayload = {
    problems: [
      { slug: "exemple-probleme", name_fr: "Exemple de problème", severity_level: "medium", demand_score: 70, profitability_score: 60, seo_priority_score: 55 },
    ],
    symptoms: [{ slug: "exemple-symptome", name_fr: "Exemple de symptôme" }],
    causes: [{ slug: "exemple-cause", name_fr: "Exemple de cause" }],
    solutions: [{ slug: "exemple-solution", name_fr: "Exemple de solution", estimated_cost_min: 500, estimated_cost_max: 2000, typical_duration: "1-2 jours" }],
    professions: [{ slug: "exemple-profession", name_fr: "Exemple de profession" }],
    tags: [{ slug: "exemple-tag", label_fr: "Exemple de tag", category: "quality" }],
    questions: [{ slug: "exemple-question", question_fr: "Exemple de question ?", quick_answer_fr: "Réponse courte." }],
    relations: {
      problem_symptoms: [{ problem_slug: "exemple-probleme", symptom_slug: "exemple-symptome" }],
      problem_causes: [{ problem_slug: "exemple-probleme", cause_slug: "exemple-cause" }],
      problem_solutions: [{ problem_slug: "exemple-probleme", solution_slug: "exemple-solution" }],
      problem_professions: [{ problem_slug: "exemple-probleme", profession_slug: "exemple-profession" }],
      problem_tags: [{ problem_slug: "exemple-probleme", tag_slug: "exemple-tag" }],
      problem_questions: [{ problem_slug: "exemple-probleme", question_slug: "exemple-question" }],
    },
  };
  return JSON.stringify(template, null, 2);
}
