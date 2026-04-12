/**
 * scoreRevealService — Orchestrates the score reveal sequence.
 */

export interface RevealStep {
  key: string;
  spokenText: string;
  displayText: string;
  delayMs: number;
  triggerType: "auto" | "reveal" | "interpret";
}

export function generateRevealScript(score: number, businessName?: string): RevealStep[] {
  const interpretation = getSpokenInterpretation(score);

  return [
    {
      key: "preparation",
      spokenText: "J'ai terminé l'analyse de votre présence actuelle. Ce que je vais vous montrer maintenant, ce n'est pas juste un chiffre.",
      displayText: "Analyse terminée. Alex prépare votre résultat.",
      delayMs: 4000,
      triggerType: "auto",
    },
    {
      key: "context",
      spokenText: "C'est un indicateur de la façon dont votre entreprise est comprise, structurée et recommandable dans un environnement piloté par l'IA.",
      displayText: "Score de lisibilité IA de votre entreprise.",
      delayMs: 5000,
      triggerType: "auto",
    },
    {
      key: "dimensions",
      spokenText: "Pour arriver à ce résultat, j'ai regardé votre visibilité, la clarté de vos services, vos signaux de confiance, votre capacité à convertir, et votre présence locale.",
      displayText: "5 dimensions analysées : visibilité, clarté, confiance, conversion, présence locale.",
      delayMs: 6000,
      triggerType: "auto",
    },
    {
      key: "pre_reveal",
      spokenText: "Je vais maintenant vous dévoiler votre score AIPP.",
      displayText: "Dévoilement du score…",
      delayMs: 2500,
      triggerType: "auto",
    },
    {
      key: "reveal",
      spokenText: `Votre score actuel est de ${score} sur 100.`,
      displayText: `Score AIPP : ${score}/100`,
      delayMs: 3000,
      triggerType: "reveal",
    },
    {
      key: "interpretation",
      spokenText: `Concrètement, cela veut dire : ${interpretation}`,
      displayText: interpretation,
      delayMs: 5000,
      triggerType: "interpret",
    },
    {
      key: "bridge",
      spokenText: "Et maintenant, je vais vous montrer exactement ce qui influence ce score le plus, et ce qu'on peut améliorer rapidement.",
      displayText: "Découvrez vos points faibles et gains rapides.",
      delayMs: 4000,
      triggerType: "auto",
    },
  ];
}

function getSpokenInterpretation(score: number): string {
  if (score >= 80)
    return "votre entreprise est bien positionnée. Vous avez une base solide pour dominer votre territoire et capter davantage de rendez-vous qualifiés.";
  if (score >= 60)
    return "vous avez une bonne base, mais quelques ajustements stratégiques peuvent significativement améliorer votre visibilité et votre taux de conversion.";
  if (score >= 40)
    return "votre entreprise existe en ligne, mais l'IA a du mal à la comprendre et à la recommander. Des corrections rapides peuvent changer la donne.";
  return "votre visibilité IA est très faible. L'IA ne peut pas vous recommander efficacement. Mais le potentiel de correction est important et les résultats peuvent être rapides.";
}

export function getQuickWins(score: number) {
  const wins = [];
  if (score < 70) wins.push({ title: "Ajouter une description détaillée des services", impact: "+8 à +12 points" });
  if (score < 60) wins.push({ title: "Ajouter des avis clients vérifiés", impact: "+10 à +15 points" });
  if (score < 50) wins.push({ title: "Compléter le profil Google Business", impact: "+5 à +10 points" });
  if (score < 80) wins.push({ title: "Ajouter des photos de réalisations", impact: "+5 à +8 points" });
  if (score < 65) wins.push({ title: "Créer une page de services claire", impact: "+6 à +10 points" });
  return wins.slice(0, 4);
}

export function getMainWeakness(score: number) {
  if (score < 30) return { weakness: "Absence de présence structurée", description: "Votre entreprise est quasi invisible pour les systèmes de recommandation IA.", impact: "Critique" };
  if (score < 50) return { weakness: "Signaux de confiance insuffisants", description: "Peu d'avis, pas de certifications visibles, informations incomplètes.", impact: "Élevé" };
  if (score < 70) return { weakness: "Structure de contenu faible", description: "Vos services manquent de clarté et de détail pour l'indexation IA.", impact: "Modéré" };
  return { weakness: "Optimisation de conversion", description: "La base est solide mais la conversion peut être améliorée avec des CTA plus clairs.", impact: "Faible" };
}

export function getDefaultDimensions(score: number) {
  const base = score;
  return [
    { label: "Visibilité", score: Math.min(100, base + Math.round(Math.random() * 10 - 5)), maxScore: 100 },
    { label: "Clarté des services", score: Math.min(100, base + Math.round(Math.random() * 15 - 10)), maxScore: 100 },
    { label: "Signaux de confiance", score: Math.min(100, base + Math.round(Math.random() * 12 - 8)), maxScore: 100 },
    { label: "Capacité de conversion", score: Math.min(100, base + Math.round(Math.random() * 10 - 7)), maxScore: 100 },
    { label: "Présence locale", score: Math.min(100, base + Math.round(Math.random() * 8 - 4)), maxScore: 100 },
  ];
}
