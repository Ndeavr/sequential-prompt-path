/**
 * UNPRO Smart Recommendation Engine
 * Pure deterministic recommendations for strategic fields.
 */
import type { SmartContextRuntime, SmartRecommendation } from "@/features/smartContext/types";

export function recommend(
  fieldId: string,
  ctx: SmartContextRuntime,
): SmartRecommendation | null {
  switch (fieldId) {
    case "territory.radius_km": {
      const goal = ctx.goal;
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

    case "territory.cities": {
      if (ctx.cityName) {
        return {
          kind: "opportunity",
          reasonFr: `${ctx.cityName} présente actuellement une forte demande dans votre métier.`,
          source: "territory",
        };
      }
      return null;
    }

    case "plan.tier": {
      const cap = ctx.capacity ?? 0;
      const goal = ctx.goal;
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
      return {
        kind: "recommended",
        value: "Pro",
        reasonFr: "Le plan Pro est aligné avec votre capacité et vos objectifs.",
        source: "goal",
      };
    }

    case "operations.response_time":
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

    case "profile.photos_before_after":
      return {
        kind: "opportunity",
        reasonFr: "Ajoutez 3 à 5 photos avant/après pour améliorer votre visibilité IA.",
        source: "ai",
      };

    case "access.xl_projects": {
      const cap = ctx.capacity ?? 0;
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

    default:
      return null;
  }
}
