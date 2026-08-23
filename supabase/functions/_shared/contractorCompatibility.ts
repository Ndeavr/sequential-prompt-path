// UNPRO — Profil de compatibilité entrepreneur : logique partagée (résolution, calcul, matérialisation).
// Le contractor_id n'est JAMAIS pris tel quel depuis le client : il est résolu depuis le JWT,
// ou validé contre le rôle admin.

export const compatCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export type Stance = "priority" | "accepted" | "not_wanted";
export type TriAnswer = "yes" | "no" | "depends";
export type TerritoryTier = "priority" | "normal" | "large_only" | "blocked";
export type PrequalLevel = "optional" | "important" | "required";

export interface CompatAnswers {
  services?: Record<string, { stance?: Stance; min_project_cents?: number | null }>;
  projects?: Record<string, { answer?: TriAnswer; condition_note?: string }>;
  money?: {
    floor_project_cents?: number | null;
    ideal_min_cents?: number | null;
    ideal_max_cents?: number | null;
    volume_preference?: string;
  };
  territories?: Array<{
    city_name?: string;
    city_slug?: string;
    tier?: TerritoryTier;
    min_project_cents?: number | null;
  }>;
  capacity?: {
    projects_per_month?: number | null;
    lead_time_weeks?: number | null;
    accepts_emergency?: boolean;
    responds_24_48?: boolean;
    weekend?: boolean;
    winter?: boolean;
    paused?: boolean;
  };
  prequal?: Record<string, PrequalLevel>;
  critical_notes?: string[];
  learning_opt_in?: boolean;
}

const STANCES: Stance[] = ["priority", "accepted", "not_wanted"];
const TRI: TriAnswer[] = ["yes", "no", "depends"];
const TIERS: TerritoryTier[] = ["priority", "normal", "large_only", "blocked"];
const LEVELS: PrequalLevel[] = ["optional", "important", "required"];

function cents(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100_000_000) return null;
  return Math.round(n);
}

function str(v: unknown, max = 500): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export function citySlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Nettoyage strict : rien d'inconnu n'entre en base. */
/**
 * Fusionne les réponses reçues avec celles déjà stockées (autosave par étape).
 * Une étape ne doit JAMAIS effacer les étapes précédentes.
 */
export function mergeAnswers(stored: unknown, incoming: unknown): CompatAnswers {
  const a = (stored ?? {}) as Record<string, any>;
  const b = (incoming ?? {}) as Record<string, any>;
  const out: Record<string, any> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (v && typeof v === "object" && !Array.isArray(v) && a[k] && typeof a[k] === "object" && !Array.isArray(a[k])) {
      out[k] = { ...a[k], ...v };
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return sanitizeAnswers(out);
}

export function sanitizeAnswers(raw: unknown): CompatAnswers {
  const a = (raw ?? {}) as CompatAnswers;
  const out: CompatAnswers = {};

  out.services = {};
  for (const [slug, v] of Object.entries(a.services ?? {})) {
    const key = str(slug, 80);
    if (!key) continue;
    const stance = STANCES.includes(v?.stance as Stance) ? (v!.stance as Stance) : "accepted";
    out.services[key] = { stance, min_project_cents: cents(v?.min_project_cents) };
  }

  out.projects = {};
  for (const [k, v] of Object.entries(a.projects ?? {})) {
    const key = str(k, 120);
    if (!key || !key.includes(":")) continue;
    if (!TRI.includes(v?.answer as TriAnswer)) continue;
    out.projects[key] = {
      answer: v!.answer as TriAnswer,
      condition_note: str(v?.condition_note, 400) ?? undefined,
    };
  }

  out.money = {
    floor_project_cents: cents(a.money?.floor_project_cents),
    ideal_min_cents: cents(a.money?.ideal_min_cents),
    ideal_max_cents: cents(a.money?.ideal_max_cents),
    volume_preference: ["volume", "value", "balanced"].includes(a.money?.volume_preference ?? "")
      ? a.money!.volume_preference
      : undefined,
  };

  out.territories = (a.territories ?? [])
    .map((t) => {
      const name = str(t?.city_name, 120);
      const slug = str(t?.city_slug, 120) ?? (name ? citySlug(name) : null);
      if (!slug) return null;
      return {
        city_name: name ?? slug,
        city_slug: slug,
        tier: TIERS.includes(t?.tier as TerritoryTier) ? (t!.tier as TerritoryTier) : "normal",
        min_project_cents: cents(t?.min_project_cents),
      };
    })
    .filter(Boolean) as CompatAnswers["territories"];

  const cap = a.capacity ?? {};
  const num = (v: unknown, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= max ? Math.round(n) : null;
  };
  out.capacity = {
    projects_per_month: num(cap.projects_per_month, 500),
    lead_time_weeks: num(cap.lead_time_weeks, 104),
    accepts_emergency: !!cap.accepts_emergency,
    responds_24_48: !!cap.responds_24_48,
    weekend: !!cap.weekend,
    winter: !!cap.winter,
    paused: !!cap.paused,
  };

  out.prequal = {};
  for (const [k, v] of Object.entries(a.prequal ?? {})) {
    const key = str(k, 80);
    if (!key || !LEVELS.includes(v as PrequalLevel)) continue;
    out.prequal[key] = v as PrequalLevel;
  }

  out.critical_notes = (a.critical_notes ?? [])
    .slice(0, 3)
    .map((n) => str(n, 500) ?? "");

  out.learning_opt_in = a.learning_opt_in !== false;
  return out;
}

/** Complétion 0-100, pondérée par étape. */
export function computeCompletion(a: CompatAnswers): number {
  let pct = 0;
  const services = Object.values(a.services ?? {});
  if (services.some((s) => s.stance === "priority" || s.stance === "accepted")) pct += 25;
  if (Object.keys(a.projects ?? {}).length >= 5) pct += 20;
  else if (Object.keys(a.projects ?? {}).length > 0) pct += 10;
  if (a.money?.floor_project_cents != null || a.money?.ideal_min_cents != null) pct += 15;
  if ((a.territories ?? []).length > 0) pct += 15;
  if (a.capacity?.projects_per_month != null || a.capacity?.lead_time_weeks != null) pct += 10;
  if (Object.keys(a.prequal ?? {}).length > 0) pct += 15;
  return Math.min(pct, 100);
}

export function buildSummary(a: CompatAnswers) {
  const entries = Object.entries(a.services ?? {});
  return {
    priority_services: entries.filter(([, v]) => v.stance === "priority").map(([k]) => k),
    accepted_services: entries.filter(([, v]) => v.stance === "accepted").map(([k]) => k),
    refused_services: entries.filter(([, v]) => v.stance === "not_wanted").map(([k]) => k),
    accepts: Object.entries(a.projects ?? {}).filter(([, v]) => v.answer === "yes").map(([k]) => k),
    evaluates: Object.entries(a.projects ?? {}).filter(([, v]) => v.answer === "depends").map(([k]) => k),
    refuses: Object.entries(a.projects ?? {}).filter(([, v]) => v.answer === "no").map(([k]) => k),
    territories: (a.territories ?? []).map((t) => ({ city: t.city_name, tier: t.tier, min: t.min_project_cents })),
    floor_project_cents: a.money?.floor_project_cents ?? null,
    capacity: a.capacity ?? {},
    prequalification: a.prequal ?? {},
  };
}

/** Écrit les tables normalisées à partir des réponses (idempotent). */
export async function materialize(
  supabase: any,
  contractorId: string,
  a: CompatAnswers,
  opts: { finalize: boolean },
) {
  const now = new Date().toISOString();

  // Services
  const svcRows = Object.entries(a.services ?? {}).map(([slug, v]) => ({
    contractor_id: contractorId,
    service_slug: slug,
    stance: v.stance,
    min_project_cents: v.min_project_cents ?? null,
    source: "declared",
    updated_at: now,
  }));
  if (svcRows.length) {
    await supabase.from("contractor_service_preferences").upsert(svcRows, {
      onConflict: "contractor_id,service_slug",
    });
  }

  // Projets
  const projRows = Object.entries(a.projects ?? {}).map(([k, v]) => {
    const [dimension, key] = k.split(":");
    return {
      contractor_id: contractorId,
      dimension,
      key,
      answer: v.answer,
      condition_note: v.condition_note ?? null,
      confidence: 1,
      source: "declared",
      updated_at: now,
    };
  });
  if (projRows.length) {
    await supabase.from("contractor_project_preferences").upsert(projRows, {
      onConflict: "contractor_id,dimension,key",
    });
  }

  // Territoires — rattachés aux zones déjà existantes quand elles existent
  const terrs = a.territories ?? [];
  if (terrs.length) {
    const { data: areas } = await supabase
      .from("contractor_service_areas")
      .select("id, city_name")
      .eq("contractor_id", contractorId);
    const areaBySlug = new Map<string, string>(
      (areas ?? []).map((x: any) => [citySlug(x.city_name ?? ""), x.id]),
    );
    await supabase.from("contractor_territory_preferences").upsert(
      terrs.map((t) => ({
        contractor_id: contractorId,
        area_id: areaBySlug.get(t.city_slug!) ?? null,
        city_slug: t.city_slug,
        city_name: t.city_name,
        tier: t.tier,
        min_project_cents: t.min_project_cents ?? null,
        source: "declared",
        updated_at: now,
      })),
      { onConflict: "contractor_id,city_slug" },
    );
  }

  // Préqualification
  const preqRows = Object.entries(a.prequal ?? {}).map(([criterion, level]) => ({
    contractor_id: contractorId,
    criterion,
    level,
    source: "declared",
    updated_at: now,
  }));
  if (preqRows.length) {
    await supabase.from("contractor_prequalification_requirements").upsert(preqRows, {
      onConflict: "contractor_id,criterion",
    });
  }

  if (!opts.finalize) return;

  // ── Règles de matching (uniquement à la finalisation, sur données confirmées) ──
  const rules: any[] = [];
  for (const [slug, v] of Object.entries(a.services ?? {})) {
    if (v.stance === "not_wanted") {
      rules.push({ rule_type: "hard_exclusion", rule_key: `service:${slug}`, payload: { service_slug: slug } });
    } else if (v.stance === "priority") {
      rules.push({ rule_type: "priority", rule_key: `service:${slug}`, payload: { service_slug: slug, boost: 15 } });
    }
    if (v.min_project_cents) {
      rules.push({
        rule_type: "soft_preference",
        rule_key: `service_min:${slug}`,
        payload: { service_slug: slug, min_project_cents: v.min_project_cents },
      });
    }
  }
  for (const [k, v] of Object.entries(a.projects ?? {})) {
    if (v.answer === "no") {
      rules.push({ rule_type: "hard_exclusion", rule_key: `project:${k}`, payload: { condition: k } });
    } else if (v.answer === "depends") {
      rules.push({
        rule_type: "soft_preference",
        rule_key: `project:${k}`,
        payload: { condition: k, note: v.condition_note ?? null },
      });
    }
  }
  for (const t of a.territories ?? []) {
    rules.push({
      rule_type: t.tier === "blocked" ? "hard_exclusion" : t.tier === "priority" ? "priority" : "soft_preference",
      rule_key: `territory:${t.city_slug}`,
      payload: { city_slug: t.city_slug, tier: t.tier, min_project_cents: t.min_project_cents ?? null },
    });
  }
  if (a.money?.floor_project_cents) {
    rules.push({
      rule_type: "soft_preference",
      rule_key: "floor_project",
      payload: { min_project_cents: a.money.floor_project_cents },
    });
  }
  rules.push({ rule_type: "capacity", rule_key: "capacity", payload: a.capacity ?? {} });
  for (const [criterion, level] of Object.entries(a.prequal ?? {})) {
    if (level === "optional") continue;
    rules.push({ rule_type: "prequalification", rule_key: criterion, payload: { criterion, level } });
  }

  // Désactiver les anciennes règles déclarées, puis réécrire.
  await supabase
    .from("contractor_matching_rules")
    .update({ is_active: false, updated_at: now })
    .eq("contractor_id", contractorId)
    .eq("source", "declared");

  if (rules.length) {
    await supabase.from("contractor_matching_rules").upsert(
      rules.map((r) => ({
        ...r,
        contractor_id: contractorId,
        source: "declared",
        is_active: true,
        confirmed_by_contractor: true,
        updated_at: now,
      })),
      { onConflict: "contractor_id,rule_type,rule_key" },
    );
  }

  // Exclusions dures confirmées → table canonique existante (remplacement complet)
  await supabase
    .from("contractor_exclusions")
    .delete()
    .eq("contractor_id", contractorId)
    .eq("source", "compatibility_profile");
  const exclusions = Object.entries(a.services ?? {})
    .filter(([, v]) => v.stance === "not_wanted")
    .map(([slug]) => ({
      contractor_id: contractorId,
      exclusion_type: "service",
      service_slug: slug,
      reason_fr: "Service non recherché (profil de compatibilité)",
      source: "compatibility_profile",
      is_active: true,
    }));
  if (exclusions.length) {
    await supabase.from("contractor_exclusions").insert(exclusions);
  }

  // Capacité : pause sans dépublier le profil
  if (a.capacity?.paused === true || a.capacity?.paused === false) {
    await supabase
      .from("contractors")
      .update({ is_accepting_appointments: !a.capacity.paused })
      .eq("id", contractorId);
  }
}

// ── Journal d'audit granulaire : diff lisible entre deux versions de réponses ──
export interface CompatChange {
  field: string;
  label_fr: string;
  before: unknown;
  after: unknown;
}

function moneyFr(v: unknown): string {
  const n = typeof v === "number" ? v : null;
  return n == null ? "—" : `${(n / 100).toLocaleString("fr-CA")} $`;
}

export function diffAnswers(before: CompatAnswers, after: CompatAnswers): CompatChange[] {
  const out: CompatChange[] = [];

  const bs = before.services ?? {};
  const as_ = after.services ?? {};
  for (const slug of new Set([...Object.keys(bs), ...Object.keys(as_)])) {
    if (bs[slug]?.stance !== as_[slug]?.stance) {
      out.push({
        field: `service:${slug}`,
        label_fr: `Service « ${slug} » : position ${bs[slug]?.stance ?? "—"} → ${as_[slug]?.stance ?? "—"}`,
        before: bs[slug]?.stance ?? null,
        after: as_[slug]?.stance ?? null,
      });
    }
    if ((bs[slug]?.min_project_cents ?? null) !== (as_[slug]?.min_project_cents ?? null)) {
      out.push({
        field: `service_min:${slug}`,
        label_fr: `Minimum « ${slug} » : ${moneyFr(bs[slug]?.min_project_cents)} → ${moneyFr(as_[slug]?.min_project_cents)}`,
        before: bs[slug]?.min_project_cents ?? null,
        after: as_[slug]?.min_project_cents ?? null,
      });
    }
  }

  const bp = before.projects ?? {};
  const ap = after.projects ?? {};
  for (const k of new Set([...Object.keys(bp), ...Object.keys(ap)])) {
    if (bp[k]?.answer !== ap[k]?.answer) {
      out.push({
        field: `project:${k}`,
        label_fr: `Condition « ${k} » : ${bp[k]?.answer ?? "—"} → ${ap[k]?.answer ?? "—"}`,
        before: bp[k]?.answer ?? null,
        after: ap[k]?.answer ?? null,
      });
    }
  }

  const moneyKeys: Array<[keyof NonNullable<CompatAnswers["money"]>, string]> = [
    ["floor_project_cents", "Plancher de projet"],
    ["ideal_min_cents", "Projet idéal (min)"],
    ["ideal_max_cents", "Projet idéal (max)"],
    ["volume_preference", "Préférence volume/valeur"],
  ];
  for (const [k, label] of moneyKeys) {
    const b = (before.money ?? {})[k] ?? null;
    const a = (after.money ?? {})[k] ?? null;
    if (b !== a) {
      const fmt = k === "volume_preference" ? (v: unknown) => String(v ?? "—") : moneyFr;
      out.push({ field: `money:${String(k)}`, label_fr: `${label} : ${fmt(b)} → ${fmt(a)}`, before: b, after: a });
    }
  }

  const bt = new Map((before.territories ?? []).map((t) => [t.city_slug!, t]));
  const at = new Map((after.territories ?? []).map((t) => [t.city_slug!, t]));
  for (const slug of new Set([...bt.keys(), ...at.keys()])) {
    const b = bt.get(slug);
    const a = at.get(slug);
    if (b?.tier !== a?.tier) {
      out.push({
        field: `territory:${slug}`,
        label_fr: `Territoire « ${a?.city_name ?? b?.city_name ?? slug} » : ${b?.tier ?? "retiré"} → ${a?.tier ?? "retiré"}`,
        before: b?.tier ?? null,
        after: a?.tier ?? null,
      });
    }
    if ((b?.min_project_cents ?? null) !== (a?.min_project_cents ?? null)) {
      out.push({
        field: `territory_min:${slug}`,
        label_fr: `Minimum territoire « ${a?.city_name ?? slug} » : ${moneyFr(b?.min_project_cents)} → ${moneyFr(a?.min_project_cents)}`,
        before: b?.min_project_cents ?? null,
        after: a?.min_project_cents ?? null,
      });
    }
  }

  const capKeys: Array<[string, string]> = [
    ["projects_per_month", "Projets par mois"],
    ["lead_time_weeks", "Délai (semaines)"],
    ["accepts_emergency", "Urgences"],
    ["responds_24_48", "Réponse 24-48 h"],
    ["weekend", "Fins de semaine"],
    ["winter", "Hiver"],
    ["paused", "Agenda en pause"],
  ];
  for (const [k, label] of capKeys) {
    const b = (before.capacity as any)?.[k] ?? null;
    const a = (after.capacity as any)?.[k] ?? null;
    if (b !== a) {
      out.push({ field: `capacity:${k}`, label_fr: `${label} : ${String(b ?? "—")} → ${String(a ?? "—")}`, before: b, after: a });
    }
  }

  const bq = before.prequal ?? {};
  const aq = after.prequal ?? {};
  for (const k of new Set([...Object.keys(bq), ...Object.keys(aq)])) {
    if (bq[k] !== aq[k]) {
      out.push({
        field: `prequal:${k}`,
        label_fr: `Exigence « ${k} » : ${bq[k] ?? "—"} → ${aq[k] ?? "—"}`,
        before: bq[k] ?? null,
        after: aq[k] ?? null,
      });
    }
  }

  return out.slice(0, 60);
}
