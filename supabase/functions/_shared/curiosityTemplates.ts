// PROTECTED — UNPRO curiosity-funnel SMS sequence (3 steps, 24h cadence).
// Stop conditions: lead clicks → activates → pays, replies, STOP, or sequence completes.

export type CuriosityStep = {
  step: number;
  delay_hours: number;
  body: (vars: { first_name?: string | null; business_name?: string | null; url: string }) => string;
};

const fallbackFirst = (n?: string | null) => (n && n.trim().length > 0 ? n.trim() : "Bonjour");

export const CURIOSITY_STEPS: CuriosityStep[] = [
  {
    step: 1,
    delay_hours: 0,
    body: ({ first_name, url }) =>
      `${fallbackFirst(first_name)}, si un propriétaire demandait aujourd'hui à ChatGPT quel entrepreneur choisir dans votre domaine, votre entreprise serait-elle recommandée? Analyse gratuite: ${url} — Alex, UNPRO`,
  },
  {
    step: 2,
    delay_hours: 24,
    body: ({ url }) =>
      `Vos concurrents commencent à apparaître dans les réponses de ChatGPT et Gemini. Voyez où votre entreprise se situe: ${url} — Alex, UNPRO`,
  },
  {
    step: 3,
    delay_hours: 24,
    body: ({ url }) =>
      `Une entreprise de 3 employés peut maintenant rivaliser avec une de 100. L'IA ne mesure plus le budget, elle mesure les signaux. Votre analyse: ${url} — Alex, UNPRO`,
  },
];

export const CURIOSITY_TOTAL_STEPS = CURIOSITY_STEPS.length;

const BASE_URL = "https://app.unpro.ca/ia";

export function buildCuriosityUrl(slug: string, token: string): string {
  return `${BASE_URL}/${slug}?t=${token}`;
}
