/**
 * Client view of the server-owned website analysis stored on the matching
 * draft (`answers._website_analysis`). Suggestions are never declarations:
 * they are applied only when the owner explicitly picks them, and never
 * replace a saved value silently.
 */
import { supabase } from "@/integrations/supabase/client";

export const ANALYSIS_KEY = "_website_analysis";
export type Suggestion = { value: string; method: "json_ld" | "meta" | "title" | "page_heading"; page: string };
export type WebsiteAnalysis = {
  status: "succeeded" | "failed";
  reason: string | null;
  source_url: string;
  checked_at: string;
  pages: { url: string; fetched_at: string }[];
  suggestions: { business_name: Suggestion | null; description: Suggestion | null; services: Suggestion[]; territories: Suggestion[] };
};

const isSuggestion = (v: unknown): v is Suggestion =>
  Boolean(v) && typeof (v as Suggestion).value === "string" && typeof (v as Suggestion).page === "string";

/** Strict shape check: anything malformed is treated as "no analysis". */
export function readAnalysis(answers: Record<string, unknown> | null | undefined): WebsiteAnalysis | null {
  const raw = answers?.[ANALYSIS_KEY] as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== "object") return null;
  if (raw.status !== "succeeded" && raw.status !== "failed") return null;
  if (typeof raw.checked_at !== "string" || typeof raw.source_url !== "string") return null;
  const s = (raw.suggestions ?? {}) as Record<string, unknown>;
  const list = (v: unknown) => (Array.isArray(v) ? v.filter(isSuggestion) : []);
  return {
    status: raw.status,
    reason: typeof raw.reason === "string" ? raw.reason : null,
    source_url: raw.source_url,
    checked_at: raw.checked_at,
    pages: Array.isArray(raw.pages) ? (raw.pages as WebsiteAnalysis["pages"]).filter(p => p && typeof p.url === "string") : [],
    suggestions: {
      business_name: isSuggestion(s.business_name) ? s.business_name : null,
      description: isSuggestion(s.description) ? s.description : null,
      services: list(s.services),
      territories: list(s.territories),
    },
  };
}

export function suggestionCount(a: WebsiteAnalysis | null): number {
  if (!a || a.status !== "succeeded") return 0;
  const s = a.suggestions;
  return (s.business_name ? 1 : 0) + (s.description ? 1 : 0) + s.services.length + s.territories.length;
}

const fold = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

/** Adds picked items to a saved list; never removes or reorders saved answers. */
export function addToList(current: unknown, value: string): string[] {
  const saved = Array.isArray(current) ? current.filter((x): x is string => typeof x === "string") : [];
  return saved.some(item => fold(item) === fold(value)) ? saved : [...saved, value];
}
export function listHas(current: unknown, value: string): boolean {
  return Array.isArray(current) && current.some(item => typeof item === "string" && fold(item) === fold(value));
}
/** A single-value suggestion fills an empty field; a different saved value needs an explicit replace. */
export function singleValueAction(saved: string, suggestion: string): "same" | "fill" | "replace" {
  if (fold(saved) === fold(suggestion)) return "same";
  return saved.trim() ? "replace" : "fill";
}

export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export function analysisFailureMessage(reason: string | null, fr: boolean): string {
  const t = (f: string, e: string) => (fr ? f : e);
  switch (reason) {
    case "unsafe_source": return t("Cette adresse ne peut pas être lue : utilisez le site public de votre entreprise en https.", "This address cannot be read: use your business's public https website.");
    case "unsafe_dns": return t("Cette adresse ne mène pas à un site public.", "This address does not lead to a public website.");
    case "robots_blocked": return t("Votre site demande aux robots de ne pas le lire. Nous respectons ce choix.", "Your website asks robots not to read it. We respect that.");
    case "redirect_outside_site": case "redirect_limit": return t("Le site redirige vers une autre adresse. Nous ne l'avons pas suivie.", "The website redirects elsewhere. We did not follow it.");
    case "not_html": case "empty_page": return t("Aucune page lisible n'a été trouvée à cette adresse.", "No readable page was found at this address.");
    case "volume_limit": return t("La page est trop volumineuse pour être lue.", "The page is too large to read.");
    case "timeout": return t("Le site a mis trop de temps à répondre.", "The website took too long to respond.");
    case "rate_limited": return t("Trop de lectures récentes. Réessayez plus tard ou continuez manuellement.", "Too many recent readings. Try later or continue manually.");
    default: return t("Le site n'a pas pu être lu.", "The website could not be read.");
  }
}

export type AnalyzeOutcome =
  | { kind: "done"; analysis: WebsiteAnalysis }
  | { kind: "auth_required" }
  | { kind: "error"; reason: string };

/** Calls the owner-authenticated action. Aborting returns a "cancelled" error. */
export async function requestWebsiteAnalysis(sessionKey: string, signal: AbortSignal): Promise<AnalyzeOutcome> {
  try {
    const { data, error } = await supabase.functions.invoke("matching-profile", {
      body: { action: "analyze_website", session_key: sessionKey },
      signal,
    });
    let body = data as { error?: string; analysis?: unknown } | null;
    if (error && (error as { context?: unknown }).context instanceof Response) {
      try { body = await ((error as { context: Response }).context.clone().json()); } catch { /* keep generic */ }
    }
    if (signal.aborted) return { kind: "error", reason: "cancelled" };
    const analysis = body?.analysis ? readAnalysis({ [ANALYSIS_KEY]: body.analysis }) : null;
    if (analysis) return { kind: "done", analysis };
    if (body?.error === "authentication_required" || body?.error === "invalid_session") return { kind: "auth_required" };
    return { kind: "error", reason: body?.error ?? "unreachable" };
  } catch {
    return { kind: "error", reason: signal.aborted ? "cancelled" : "unreachable" };
  }
}
