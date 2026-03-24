/**
 * UNPRO — Alex Predictive Seller Scripts
 * Contextual speech generation based on lead predictions
 */

export interface PredictiveContext {
  predicted_contract_value?: number;
  predicted_profit_value?: number;
  predicted_close_probability?: number;
  predicted_lead_quality_score?: number;
  predicted_pricing_sensitivity?: number;
  predicted_abandon_probability?: number;
  predicted_show_probability?: number;
  predicted_best_offer_type?: string;
  predicted_next_best_action?: string;
  confidence_score?: number;
  overall_risk_level?: string;
  no_show_risk?: number;
  price_objection_risk?: number;
  competitor_loss_risk?: number;
  dynamic_price_cents?: number;
  urgency_level?: string;
  trade_slug?: string;
  city_slug?: string;
  is_exclusive?: boolean;
  allocation_mode?: string;
}

export interface AlexScript {
  tone: "empathetic" | "confident" | "urgent" | "reassuring" | "exclusive";
  greeting: string;
  pitch: string;
  objection_handling: string;
  cta_label: string;
  cta_action: string;
  secondary_action?: string;
  confidence_note: string;
  admin_alert?: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);

export function generateAlexScript(ctx: PredictiveContext): AlexScript {
  const value = ctx.predicted_contract_value || 0;
  const profit = ctx.predicted_profit_value || 0;
  const closeProb = ctx.predicted_close_probability || 0;
  const quality = ctx.predicted_lead_quality_score || 0;
  const priceSensitivity = ctx.predicted_pricing_sensitivity || 50;
  const risk = ctx.overall_risk_level || "medium";
  const urgency = ctx.urgency_level || "medium";
  const noShow = ctx.no_show_risk || 0;
  const priceObjection = ctx.price_objection_risk || 0;
  const isExclusive = ctx.is_exclusive ?? false;
  const confidence = ctx.confidence_score || 50;

  // ─── High Value + High Confidence ───
  if (value >= 50000 && closeProb >= 0.6 && confidence >= 65) {
    return {
      tone: "confident",
      greeting: "Ce projet a un potentiel exceptionnel.",
      pitch: `Ce rendez-vous représente un contrat estimé à ${fmt(value)} avec une probabilité de fermeture de ${Math.round(closeProb * 100)}%. C'est exactement le type de projet qui justifie votre investissement sur UNPRO — un client qualifié, prêt à avancer.`,
      objection_handling: profit > 0
        ? `Même après vos coûts, le profit estimé est de ${fmt(profit)}. Le prix du rendez-vous représente ${ctx.dynamic_price_cents ? ((ctx.dynamic_price_cents / value) * 100).toFixed(1) : "< 1"}% de la valeur du contrat.`
        : "La valeur de ce projet dépasse largement le coût d'acquisition. C'est un investissement, pas une dépense.",
      cta_label: "Réserver ce rendez-vous",
      cta_action: "book_appointment",
      confidence_note: `Confiance du moteur : ${confidence}% — basée sur l'historique de projets similaires dans votre zone.`,
    };
  }

  // ─── High Price Sensitivity ───
  if (priceSensitivity >= 70 || priceObjection >= 60) {
    return {
      tone: "reassuring",
      greeting: "On comprend que chaque dollar compte.",
      pitch: `Ce rendez-vous est un client qualifié dans votre zone. Le prix reflète la demande actuelle, mais voici ce qui compte vraiment : la valeur estimée du contrat est de ${fmt(value)}. Vous investissez pour obtenir un retour concret.`,
      objection_handling: `Ce n'est pas un lead partagé avec 5 compétiteurs. C'est un rendez-vous exclusif, directement dans votre agenda. ${ctx.dynamic_price_cents ? `Le coût de ${fmt(ctx.dynamic_price_cents / 100)} est une fraction de ce que vous rapportera ce projet.` : ""}`,
      cta_label: "Voir le détail du prix",
      cta_action: "show_price_breakdown",
      secondary_action: "Parler à Alex pour comprendre",
      confidence_note: `On détecte une sensibilité au prix élevée. Notre réponse : transparence totale sur la valeur.`,
    };
  }

  // ─── High Risk ───
  if (risk === "high" || noShow >= 60) {
    return {
      tone: "empathetic",
      greeting: "Soyons transparents sur ce lead.",
      pitch: `Notre moteur détecte un niveau de risque plus élevé que la moyenne pour ce projet. ${noShow >= 60 ? "Le risque de no-show est significatif." : ""} ${priceObjection >= 50 ? "Il pourrait y avoir une objection sur le prix." : ""} On veut que vous preniez une décision éclairée.`,
      objection_handling: "C'est pourquoi UNPRO offre une garantie sur les rendez-vous qualifiés. Si le client ne se présente pas, vous êtes protégé selon votre plan SLA.",
      cta_label: "Accepter avec protection SLA",
      cta_action: "book_with_sla",
      secondary_action: "Voir les alternatives disponibles",
      confidence_note: `Transparence : notre confiance sur ce lead est de ${confidence}%. On préfère vous le dire.`,
      admin_alert: `Lead à risque élevé (no-show: ${noShow}%, objection prix: ${priceObjection}%) — surveillance recommandée.`,
    };
  }

  // ─── Exclusive Opportunity ───
  if (isExclusive || ctx.allocation_mode === "exclusive") {
    return {
      tone: "exclusive",
      greeting: "Cette opportunité vous est réservée.",
      pitch: `Ce projet n'est proposé qu'à vous. ${value > 0 ? `Valeur estimée : ${fmt(value)}.` : ""} Aucun autre entrepreneur ne verra ce rendez-vous. C'est l'avantage de votre positionnement sur UNPRO.`,
      objection_handling: "L'exclusivité signifie zéro compétition. Vous arrivez seul face au client. Votre taux de fermeture sur les exclusifs est naturellement plus élevé.",
      cta_label: "Accepter l'exclusivité",
      cta_action: "accept_exclusive",
      confidence_note: `Rendez-vous exclusif. ${closeProb > 0 ? `Probabilité de fermeture : ${Math.round(closeProb * 100)}%.` : ""}`,
    };
  }

  // ─── Urgent ───
  if (urgency === "emergency" || urgency === "high") {
    return {
      tone: "urgent",
      greeting: "Un client a besoin d'aide rapidement.",
      pitch: `Demande urgente en ${ctx.trade_slug || "services"} à ${ctx.city_slug || "votre zone"}. ${value > 0 ? `Valeur estimée : ${fmt(value)}.` : ""} Les projets urgents convertissent mieux — le client est prêt à décider maintenant.`,
      objection_handling: "En urgence, le client ne magasine pas. Il veut quelqu'un de fiable, tout de suite. C'est votre moment.",
      cta_label: "Répondre maintenant",
      cta_action: "respond_urgent",
      confidence_note: `Urgence détectée. Le temps de réponse est critique pour ce type de demande.`,
    };
  }

  // ─── Default / Standard ───
  return {
    tone: "confident",
    greeting: "Un nouveau rendez-vous qualifié est disponible.",
    pitch: `${value > 0 ? `Projet estimé à ${fmt(value)} ` : ""}en ${ctx.trade_slug || "services"} à ${ctx.city_slug || "votre zone"}. Ce rendez-vous a été qualifié par notre moteur et correspond à votre profil.`,
    objection_handling: "Chaque rendez-vous est qualifié et exclusif. Pas de leads partagés, pas de surprises.",
    cta_label: "Voir le rendez-vous",
    cta_action: "view_appointment",
    confidence_note: `Score de qualité : ${quality}/100. Confiance moteur : ${confidence}%.`,
  };
}

export function getAlexToneEmoji(tone: AlexScript["tone"]): string {
  const map: Record<string, string> = {
    empathetic: "💬",
    confident: "🎯",
    urgent: "⚡",
    reassuring: "🛡️",
    exclusive: "👑",
  };
  return map[tone] || "🤖";
}

export function getAlexToneLabel(tone: AlexScript["tone"]): string {
  const map: Record<string, string> = {
    empathetic: "Empathique",
    confident: "Confiant",
    urgent: "Urgent",
    reassuring: "Rassurant",
    exclusive: "Exclusif",
  };
  return map[tone] || "Standard";
}
