import type { Bubble, DiagnosticInputs } from "./types";
import { compute, fmtMoney } from "./engine";

export function generateBubbles(inp: DiagnosticInputs): Bubble[] {
  const r = compute(inp);
  const bubbles: Bubble[] = [];

  if (r.loss_breakdown.missed_leads > 0) {
    bubbles.push({
      id: "missed",
      category: "loss",
      title: "Appels manqués détectés",
      detail: `Environ ${Math.round((inp.monthly_leads ?? 0) * 0.25)} occasions/mois perdues par réponse tardive.`,
      value_numeric: r.loss_breakdown.missed_leads,
      formatted_value: fmtMoney(r.loss_breakdown.missed_leads) + " / mois",
    });
  }

  if (r.loss_breakdown.shared_leads_tax > 0) {
    bubbles.push({
      id: "shared",
      category: "loss",
      title: "Taxe sur soumissions partagées",
      detail: "La dépendance aux leads partagés compresse vos marges de 12 à 22 %.",
      value_numeric: r.loss_breakdown.shared_leads_tax,
      formatted_value: fmtMoney(r.loss_breakdown.shared_leads_tax) + " / mois",
    });
  }

  if (r.loss_breakdown.capacity_gap > 0) {
    bubbles.push({
      id: "capacity",
      category: "loss",
      title: "Capacité sous-utilisée",
      detail: "Votre équipe peut absorber plus de projets que ce qui circule actuellement.",
      value_numeric: r.loss_breakdown.capacity_gap,
      formatted_value: fmtMoney(r.loss_breakdown.capacity_gap) + " / mois",
    });
  }

  if (r.uplift_pct >= 0.25) {
    bubbles.push({
      id: "uplift",
      category: "opportunity",
      title: "Fort potentiel de croissance",
      detail: `Hausse projetée de ${Math.round(r.uplift_pct * 100)} % du chiffre d'affaires.`,
    });
  }

  if ((inp.closing_rate ?? 100) < 25) {
    bubbles.push({
      id: "qualif",
      category: "insight",
      title: "Qualification à optimiser",
      detail: "Votre taux de fermeture suggère un enjeu de qualification, pas de vente.",
    });
  }

  if ((inp.team_size ?? 0) >= 3) {
    bubbles.push({
      id: "structure",
      category: "insight",
      title: "Structure prête à scaler",
      detail: "Votre équipe est dimensionnée pour une montée en volume rapide.",
    });
  }

  bubbles.push({
    id: "social",
    category: "social_proof",
    title: "Entreprises comparables : +38 %",
    detail: "Les entrepreneurs comme vous croissent en moyenne de 38 % en 12 mois sur UNPRO.",
  });

  bubbles.push({
    id: "speed",
    category: "social_proof",
    title: "Top closers : < 5 minutes",
    detail: "Les meilleurs entrepreneurs répondent en moins de 5 minutes.",
  });

  return bubbles;
}
