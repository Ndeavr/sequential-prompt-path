/**
 * UNPRO — Language engine.
 * Detects FR/EN per content block; flags mixed-language pages.
 * Never allow "French header + English body" or "English CTA + French FAQ".
 */
import type { ContentLanguage } from "../generator/pageTypes";

const FR_MARKERS = /\b(le|la|les|une?|des|du|au|aux|est|sont|avec|pour|par|vous|nous|votre|notre|ceci|cela|évaluation|entrepreneur|entretoit|toiture|isolation|planifier|maison|québec|québécois|maintenant|selon|dès)\b/gi;
const EN_MARKERS = /\b(the|and|is|are|with|for|by|you|we|your|our|this|that|contractor|schedule|book|home|quote|estimate|available|now)\b/gi;

export function detectLanguage(text: string): ContentLanguage | "unknown" {
  const clean = text.trim();
  if (clean.length < 8) return "unknown";
  const fr = (clean.match(FR_MARKERS) ?? []).length;
  const en = (clean.match(EN_MARKERS) ?? []).length;
  if (fr === 0 && en === 0) return "unknown";
  if (fr >= en * 1.4) return "fr";
  if (en >= fr * 1.4) return "en";
  return "unknown"; // ambiguous → treat as mixed for validation purposes
}

export interface BlockLanguageReport {
  block: string;
  detected: ContentLanguage | "unknown";
  sample: string;
}

export function auditPageLanguage(
  expected: ContentLanguage,
  blocks: Record<string, string>,
): { ok: boolean; mismatches: BlockLanguageReport[] } {
  const mismatches: BlockLanguageReport[] = [];
  for (const [block, text] of Object.entries(blocks)) {
    if (!text || !text.trim()) continue;
    const detected = detectLanguage(text);
    if (detected !== "unknown" && detected !== expected) {
      mismatches.push({ block, detected, sample: text.slice(0, 120) });
    }
  }
  return { ok: mismatches.length === 0, mismatches };
}
