/**
 * UNPRO Smart Recommendation Engine
 * Pure deterministic recommendations for strategic fields.
 * Inputs: fieldId + runtime (goal, capacity, city, trade, currentValue).
 */
import type { SmartContextRuntime, SmartRecommendation } from "@/features/smartContext/types";

export function recommend(
  fieldId: string,
  ctx: SmartContextRuntime,
): SmartRecommendation | null {
  const goal = ctx.goal;
  const cap = ctx.capacity ?? 0;

  switch (fieldId) {
    // ── Territory ──
    case "territory.radius_km": {
      let value = 25;
      let reason = "Pour votre métier et votre ville, UNPRO recommande 25 km.";
      if (goal === "less_travel") {
        value = 15;
        reason = "Pour réduire vos déplacements, visez un rayon de 15 km.";
      } else if (goal === "grow_fast" || goal === "dominate_territory") {
        value = 35;
        reason = "Pour accélérer votre croissance, un rayon de 35 km est souvent optimal.";
      }
      return { kind: "recommended", value, reasonFr: reason, source: "goal" };
    }

    case "territory.cities":
      if (ctx.cityName) {
        return {
          kind: "opportunity",
          reasonFr: `${ctx.cityName} présente actuellement une forte demande dans votre métier.`,
          source: "territory",
        };
      }
      return null;

    // ── Plans ──
    case "plan.tier": {
      if (goal === "grow_fast" || goal === "dominate_territory" || cap >= 30) {
        return {
          kind: "upgrade",
          value: "Premium",
          reasonFr: "Votre capacité et vos objectifs justifient le plan Premium.",
          source: "goal",
        };
      }
      if (goal === "few_projects" || cap <= 8) {
        return {
          kind: "recommended",
          value: "Recrue",
          reasonFr: "Pour démarrer, le plan Recrue suffit largement.",
          source: "goal",
        };
      }
      if (goal === "bigger_contracts") {
        return {
          kind: "upgrade",
          value: "Élite",
          reasonFr: "Pour des contrats à haute valeur, le plan Élite est aligné.",
          source: "goal",
        };
      }
      return {
        kind: "recommended",
        value: "Pro",
        reasonFr: "Le plan Pro est aligné avec votre capacité et vos objectifs.",
        source: "goal",
      };
    }

    case "plan.appointments_per_month": {
      const value = Math.max(8, Math.min(60, Math.round((cap || 12) * 1.2)));
      return {
        kind: "recommended",
        value,
        reasonFr: `Selon votre capacité, environ ${value} rendez-vous/mois est optimal.`,
        source: "benchmark",
      };
    }

    case "plan.exclusivity":
      if (goal === "dominate_territory" || goal === "bigger_contracts") {
        return {
          kind: "upgrade",
          reasonFr: "L'exclusivité éliminerait la concurrence directe dans votre zone.",
          source: "goal",
        };
      }
      return null;

    case "plan.upsell_xl":
      if (cap < 15) {
        return {
          kind: "capacity_warning",
          reasonFr: "Votre capacité actuelle est probablement insuffisante pour des projets XL.",
          source: "benchmark",
        };
      }
      return {
        kind: "opportunity",
        reasonFr: "Votre capacité permet d'activer l'accès aux projets XL.",
        source: "benchmark",
      };

    // ── Operations ──
    case "operations.response_time":
    case "dashboard.response_time":
      return {
        kind: "recommended",
        value: "< 15 min",
        reasonFr: "Visez moins de 15 minutes en heures ouvrables pour maximiser vos conversions.",
        source: "benchmark",
      };

    case "operations.calendar_sync":
      return {
        kind: "recommended",
        reasonFr: "Activez la synchronisation pour éviter les conflits et améliorer votre taux d'acceptation.",
        source: "benchmark",
      };

    // ── Dashboard KPIs ──
    case "dashboard.acceptance_rate":
      return {
        kind: "recommended",
        value: "> 70 %",
        reasonFr: "Au-dessus de 70 %, UNPRO vous priorise au maximum.",
        source: "benchmark",
      };

    case "dashboard.conversion_rate":
      return {
        kind: "recommended",
        value: "> 40 %",
        reasonFr: "Un taux de fermeture supérieur à 40 % vous classe parmi les meilleurs.",
        source: "benchmark",
      };

    case "dashboard.aipp_score":
      return {
        kind: "visibility",
        value: "> 80",
        reasonFr: "Un AIPP supérieur à 80 multiplie votre flux organique.",
        source: "ai",
      };

    case "dashboard.projected_revenue":
      if (goal === "grow_fast" && cap < 20) {
        return {
          kind: "upgrade",
          reasonFr: "Pour atteindre vos objectifs, augmenter votre capacité ou votre plan serait stratégique.",
          source: "goal",
        };
      }
      return null;

    case "dashboard.profile_views":
      return {
        kind: "opportunity",
        reasonFr: "Activez plus de zones ou complétez votre profil pour augmenter vos vues.",
        source: "ai",
      };

    // ── Profile ──
    case "profile.photos_before_after":
      return {
        kind: "opportunity",
        reasonFr: "Ajoutez 3 à 5 photos avant/après pour améliorer votre visibilité IA.",
        source: "ai",
      };

    case "profile.bio_length":
      return {
        kind: "recommended",
        value: "150-400 caractères",
        reasonFr: "Une bio entre 150 et 400 caractères donne les meilleurs résultats.",
        source: "benchmark",
      };

    case "profile.services_offered":
      return {
        kind: "opportunity",
        reasonFr: "Plus vos services sont précis, plus UNPRO peut vous matcher finement.",
        source: "ai",
      };

    case "profile.certifications":
      return {
        kind: "recommended",
        reasonFr: "Complétez RBQ + assurance pour débloquer le badge UNPRO Vérifié.",
        source: "benchmark",
      };

    case "profile.years_experience":
      return {
        kind: "recommended",
        reasonFr: "Ajoutez vos années d'expérience pour renforcer votre autorité.",
        source: "ai",
      };

    case "profile.languages":
      return {
        kind: "opportunity",
        reasonFr: "Le bilinguisme ouvre des projets supplémentaires dans plusieurs zones.",
        source: "benchmark",
      };

    // ── XL access ──
    case "access.xl_projects": {
      if (cap < 15) {
        return {
          kind: "capacity_warning",
          reasonFr: "Votre capacité actuelle est probablement insuffisante pour absorber des projets XL.",
          source: "benchmark",
        };
      }
      return {
        kind: "opportunity",
        reasonFr: "Votre capacité permet d'activer l'accès aux projets XL.",
        source: "benchmark",
      };
    }

    // ── Automation ──
    case "automation.auto_accept":
    case "automation.auto_accept_bookings":
      return {
        kind: "recommended",
        reasonFr: "L'acceptation automatique peut augmenter votre taux d'acceptation de 20 à 35 %.",
        source: "benchmark",
      };

    case "automation.sms_followup":
      return {
        kind: "recommended",
        reasonFr: "La relance SMS coupe les no-shows de 30 à 50 %.",
        source: "benchmark",
      };

    case "automation.review_request":
      return {
        kind: "upgrade",
        reasonFr: "Automatiser les demandes d'avis fait monter votre AIPP mois après mois.",
        source: "ai",
      };

    case "automation.no_show_protection":
      return {
        kind: "recommended",
        reasonFr: "Récupère jusqu'à 80 % des plages annulées.",
        source: "benchmark",
      };

    case "automation.quote_auto_send":
      return {
        kind: "upgrade",
        reasonFr: "Envoyer la soumission dans l'heure double presque votre taux de fermeture.",
        source: "benchmark",
      };

    case "automation.smart_pricing":
      if (goal === "bigger_contracts" || goal === "grow_fast") {
        return {
          kind: "upgrade",
          reasonFr: "La tarification dynamique optimise vos marges sans effort.",
          source: "goal",
        };
      }
      return null;

    default:
      return null;
  }
}
