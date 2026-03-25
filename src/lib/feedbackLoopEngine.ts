/**
 * UNPRO — Market Feedback Loop Engine
 * Compares predictions vs actual outcomes to detect drift.
 */

export interface PredictionOutcomePair {
  leadId: string;
  predictedValue: number;
  actualValue: number | null;
  predictedCloseProb: number;
  didClose: boolean | null;
  predictedTimeToClose: number;
  actualTimeToClose: number | null;
  predictedShowProb: number;
  didShow: boolean | null;
}

export interface VarianceReport {
  valueVariance: { avg: number; direction: "optimistic" | "pessimistic" | "accurate"; count: number };
  closeVariance: { avg: number; direction: "optimistic" | "pessimistic" | "accurate"; count: number };
  timeVariance: { avg: number; direction: "optimistic" | "pessimistic" | "accurate"; count: number };
  showVariance: { avg: number; direction: "optimistic" | "pessimistic" | "accurate"; count: number };
  overallHealth: "healthy" | "drifting" | "critical";
  recommendations: string[];
}

function direction(variance: number): "optimistic" | "pessimistic" | "accurate" {
  if (variance > 15) return "optimistic";
  if (variance < -15) return "pessimistic";
  return "accurate";
}

export function computeVarianceReport(pairs: PredictionOutcomePair[]): VarianceReport {
  const valuePairs = pairs.filter(p => p.actualValue != null);
  const closePairs = pairs.filter(p => p.didClose != null);
  const timePairs = pairs.filter(p => p.actualTimeToClose != null);
  const showPairs = pairs.filter(p => p.didShow != null);

  const valueVar = valuePairs.length > 0
    ? valuePairs.reduce((s, p) => s + ((p.predictedValue - (p.actualValue || 0)) / Math.max(p.predictedValue, 1)) * 100, 0) / valuePairs.length
    : 0;

  const closeVar = closePairs.length > 0
    ? closePairs.reduce((s, p) => s + (p.predictedCloseProb * 100 - (p.didClose ? 100 : 0)), 0) / closePairs.length
    : 0;

  const timeVar = timePairs.length > 0
    ? timePairs.reduce((s, p) => s + (p.predictedTimeToClose - (p.actualTimeToClose || 0)), 0) / timePairs.length
    : 0;

  const showVar = showPairs.length > 0
    ? showPairs.reduce((s, p) => s + (p.predictedShowProb * 100 - (p.didShow ? 100 : 0)), 0) / showPairs.length
    : 0;

  const recommendations: string[] = [];
  if (Math.abs(valueVar) > 20) recommendations.push("Recalibrer les coefficients de valeur de contrat");
  if (Math.abs(closeVar) > 25) recommendations.push("Ajuster les poids de probabilité de fermeture");
  if (Math.abs(timeVar) > 5) recommendations.push("Revoir les estimations de délai de fermeture");
  if (Math.abs(showVar) > 20) recommendations.push("Affiner le modèle de prédiction de présence");

  const avgAbs = (Math.abs(valueVar) + Math.abs(closeVar) + Math.abs(showVar)) / 3;
  const overallHealth = avgAbs < 15 ? "healthy" : avgAbs < 30 ? "drifting" : "critical";

  return {
    valueVariance: { avg: Math.round(valueVar), direction: direction(valueVar), count: valuePairs.length },
    closeVariance: { avg: Math.round(closeVar), direction: direction(closeVar), count: closePairs.length },
    timeVariance: { avg: Math.round(timeVar), direction: direction(timeVar), count: timePairs.length },
    showVariance: { avg: Math.round(showVar), direction: direction(showVar), count: showPairs.length },
    overallHealth,
    recommendations,
  };
}
