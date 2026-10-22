/**
 * Import affilié en brouillon (« Mes imports ») — jamais de réservation ni d'attribution.
 * Le dédoublonnage et la propriété sont décidés côté serveur (affiliate_stage_import),
 * à partir de la session : aucun identifiant d'affilié n'est envoyé par le navigateur.
 */
import { supabase } from "@/integrations/supabase/client";

export type StageRow = { company_name?: string; phone?: string; email?: string; website?: string; city?: string; category?: string };
export type StageSource = "manual" | "paste" | "csv" | "photo" | "pdf" | "website";
export type StageStatus = "new" | "own" | "exists" | "reserved_elsewhere" | "client" | "review" | "invalid";
export type StageResult = { row_index: number; status: StageStatus; next_action: string };

export const MAX_ROWS = 100;
export const MAX_FILE_BYTES = 200 * 1024;
export const ACCEPTED_LIST_TYPES = [".csv", ".txt"];

export const STATUS_LABEL: Record<StageStatus, { label: string; tone: "new" | "exists" | "review" }> = {
  new: { label: "Nouveau", tone: "new" },
  own: { label: "Déjà dans vos dossiers", tone: "exists" },
  exists: { label: "Dossier déjà existant", tone: "exists" },
  reserved_elsewhere: { label: "Suivi déjà réservé", tone: "exists" },
  client: { label: "Déjà inscrit chez UNPRO", tone: "exists" },
  review: { label: "À examiner", tone: "review" },
  invalid: { label: "Incomplet", tone: "review" },
};

const HEADER_ALIASES: Record<keyof StageRow, string[]> = {
  company_name: ["entreprise", "nom", "compagnie", "company", "name", "nom de l'entreprise", "business"],
  phone: ["téléphone", "telephone", "tel", "tél", "phone", "cellulaire", "mobile"],
  email: ["courriel", "email", "e-mail", "mail"],
  website: ["site", "site web", "website", "url", "web"],
  city: ["ville", "city", "municipalité"],
  category: ["métier", "metier", "catégorie", "categorie", "category", "trade"],
};

function splitLine(line: string, sep: string): string[] {
  const out: string[] = []; let cur = ""; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === sep && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function detectSep(lines: string[]): string {
  const cands = ["\t", ";", ","];
  const score = (s: string) => lines.slice(0, 5).reduce((n, l) => n + (l.split(s).length - 1), 0);
  return cands.sort((a, b) => score(b) - score(a))[0];
}

/** Devine le champ d'une cellule sans en-tête. */
function guessCell(v: string): keyof StageRow | null {
  if (/@/.test(v)) return "email";
  if (/^(https?:\/\/|www\.)|\.(ca|com|net|org|qc\.ca)(\/|$)/i.test(v)) return "website";
  if ((v.replace(/\D/g, "").length === 10 || v.replace(/\D/g, "").length === 11) && /^[\d\s().+-]+$/.test(v)) return "phone";
  return null;
}

/** Colle une liste (tableur, CSV ou une entreprise par ligne) → lignes structurées. */
export function parseList(text: string): { rows: StageRow[]; truncated: boolean } {
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { rows: [], truncated: false };
  const sep = detectSep(lines);
  const first = splitLine(lines[0], sep).map((h) => h.toLowerCase());
  const map: (keyof StageRow | null)[] = first.map((h) =>
    (Object.keys(HEADER_ALIASES) as (keyof StageRow)[]).find((k) => HEADER_ALIASES[k].includes(h)) ?? null);
  const hasHeader = map.filter(Boolean).length >= 2;
  const body = hasHeader ? lines.slice(1) : lines;
  const rows: StageRow[] = body.map((l) => {
    const cells = splitLine(l, sep);
    const row: StageRow = {};
    cells.forEach((c, i) => {
      if (!c) return;
      const k = hasHeader ? map[i] : guessCell(c) ?? (!row.company_name ? "company_name" : !row.city ? "city" : null);
      if (k && !row[k]) row[k] = c.slice(0, 200);
    });
    return row;
  }).filter((r) => Object.keys(r).length > 0);
  return { rows: rows.slice(0, MAX_ROWS), truncated: rows.length > MAX_ROWS };
}

export function validateListFile(f: File): string | null {
  const name = f.name.toLowerCase();
  if (!ACCEPTED_LIST_TYPES.some((e) => name.endsWith(e))) return "Format non accepté : CSV ou texte seulement (Excel : enregistrez en CSV).";
  if (f.size === 0) return "Fichier vide.";
  if (f.size > MAX_FILE_BYTES) return "Fichier trop lourd (200 Ko maximum, 100 lignes par lot).";
  return null;
}

/** Empreinte stable du lot : même contenu = même lot (idempotent). */
export async function hashRows(source: StageSource, rows: StageRow[]): Promise<string> {
  const data = new TextEncoder().encode(source + JSON.stringify(rows));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const ERRORS: Record<string, string> = {
  auth_required: "Connectez-vous pour enregistrer.",
  affiliate_required: "Espace affilié actif requis.",
  empty_import: "Aucune ligne à enregistrer.",
  too_many_rows: "100 lignes maximum par lot.",
  import_rate_limited: "Trop d'imports cette heure-ci. Réessayez plus tard.",
};

export async function stageImport(rows: StageRow[], source: StageSource, fileName: string | null): Promise<StageResult[]> {
  if (rows.length === 0) throw new Error(ERRORS.empty_import);
  if (rows.length > MAX_ROWS) throw new Error(ERRORS.too_many_rows);
  const hash = await hashRows(source, rows);
  const { data, error } = await (supabase as any).rpc("affiliate_stage_import", {
    p_rows: rows, p_source_type: source, p_file_name: fileName, p_batch_hash: hash,
  });
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message?.includes(k));
    throw new Error(key ? ERRORS[key] : "Enregistrement impossible. Réessayez.");
  }
  return (data ?? []) as StageResult[];
}
