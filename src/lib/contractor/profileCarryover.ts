/**
 * Reprise des déclarations canoniques du profil de jumelage (réponses
 * enregistrées par l'entrepreneur) dans un résumé modifiable.
 *
 * Seules les réponses réellement enregistrées apparaissent; rien n'est déduit
 * du métier (aucun service « type » ajouté), rien n'est complété par défaut.
 */
import { MATCHING_QUESTIONS } from "@/lib/matching/matchingQuestions";

type Lang = "fr" | "en";

function optionLabel(key: string, value: string, lang: Lang): string {
  const q = MATCHING_QUESTIONS.find((x) => x.key === key);
  const opt = q?.options?.find((o) => o.value === value);
  if (!opt) return value;
  return lang === "en" ? opt.label_en ?? opt.label : opt.label;
}

const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((x) => x.trim()) : [];

export function canonicalProfileRows(answers: Record<string, unknown> | null | undefined, lang: Lang = "fr"): Array<[string, string]> {
  if (!answers) return [];
  const rows: Array<[string, string]> = [];
  const langs = list(answers.languages);
  if (langs.length) rows.push([lang === "en" ? "Languages (declared)" : "Langues de service (déclarées)", langs.map((v) => optionLabel("languages", v, lang)).join(", ")]);
  const avail = typeof answers.availability === "string" && answers.availability.trim() ? answers.availability.trim() : null;
  if (avail) rows.push([lang === "en" ? "Next availability (declared)" : "Prochaine disponibilité (déclarée)", optionLabel("availability", avail, lang)]);
  const wanted = list(answers.services_wanted);
  if (wanted.length) rows.push([lang === "en" ? "Services offered (declared)" : "Services offerts (déclarés)", wanted.join(", ")]);
  const refused = list(answers.services_refused);
  if (refused.length) rows.push([lang === "en" ? "Services refused (declared)" : "Services refusés (déclarés)", refused.join(", ")]);
  return rows;
}

/** Première personne-ressource : prénom de la personne, jamais le nom de l'entreprise. */
export function contactFirstName(meta: Record<string, unknown> | null | undefined, companyName: string | null | undefined): string | null {
  const n = [meta?.first_name, meta?.given_name].find((v): v is string => typeof v === "string" && v.trim().length > 1)?.trim() ?? null;
  if (!n) return null;
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (companyName && norm(companyName).startsWith(norm(n)) && norm(n).length >= norm(companyName).length * 0.6) return null;
  return n;
}
