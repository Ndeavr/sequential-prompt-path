/**
 * quoteAnalysisClient — Convert files, call edge function, persist + retrieve analyses.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AnalyzedQuote {
  slot: number;
  vendor: string;
  amount: number | null;
  warranty: string | null;
  score: number;
  inclusions: string[];
  exclusions: string[];
  risks: string[];
  isBestValue?: boolean;
}

export interface QuoteAnalysisPayload {
  quotes: AnalyzedQuote[];
  recommendation: string;
  confidenceScore: number;
  scopeGaps?: string[];
  priceAnomalies?: string[];
  homeownerQuestions?: string[];
}

export interface QuoteAnalysisRow {
  id: string;
  user_id: string | null;
  payload: QuoteAnalysisPayload;
  file_count: number;
  created_at: string;
}

const SS_KEY = "unpro.quote_analysis_id";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export async function runQuoteAnalysis(files: File[]): Promise<{ analysis_id: string; payload: QuoteAnalysisPayload }> {
  const prepped = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      mimeType: f.type || "application/octet-stream",
      base64: await fileToBase64(f),
    })),
  );

  // Enforce a minimum "thinking" duration so animation completes
  const MIN_MS = 6500;
  const [result] = await Promise.all([
    supabase.functions.invoke("analyze-quote-comparative", { body: { files: prepped } }),
    new Promise((r) => setTimeout(r, MIN_MS)),
  ]);

  if (result.error) throw new Error(result.error.message || "Erreur d'analyse");
  const data = result.data as { analysis_id: string; payload: QuoteAnalysisPayload; error?: string };
  if (!data?.analysis_id) throw new Error(data?.error || "Réponse invalide");

  try {
    sessionStorage.setItem(SS_KEY, data.analysis_id);
  } catch {
    /* ignore */
  }
  return data;
}

export function getStoredAnalysisId(): string | null {
  try {
    return sessionStorage.getItem(SS_KEY);
  } catch {
    return null;
  }
}

export function clearStoredAnalysisId() {
  try {
    sessionStorage.removeItem(SS_KEY);
  } catch {
    /* ignore */
  }
}

export async function claimAndLoadAnalysis(id: string): Promise<QuoteAnalysisRow> {
  const { data, error } = await supabase.functions.invoke("claim-quote-analysis", {
    body: { analysis_id: id },
  });
  if (error) throw new Error(error.message || "Erreur de chargement");
  const row = (data as { analysis: QuoteAnalysisRow })?.analysis;
  if (!row) throw new Error("Analyse introuvable");
  return row;
}
