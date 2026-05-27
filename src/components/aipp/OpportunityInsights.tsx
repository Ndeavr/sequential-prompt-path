/**
 * OpportunityInsights — Cartes d'opportunités détectées + signaux de confiance
 * + projection IA. Affiché sous le score AIPP pour transformer le score en
 * révélation business.
 */
import { motion } from "framer-motion";
import { TrendingUp, Sparkles, ShieldCheck, MapPin, Star, Lightbulb } from "lucide-react";

export interface Opportunity {
  icon: typeof Lightbulb;
  title: string;
  hint: string;
}

export interface TrustSignal {
  icon: typeof ShieldCheck;
  label: string;
  active: boolean;
}

interface Props {
  city?: string;
  opportunities?: Opportunity[];
  trustSignals?: TrustSignal[];
  multiplier?: number;
}

const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  { icon: MapPin, title: "Domination locale faible", hint: "Votre présence peut être renforcée dans vos villes principales." },
  { icon: Sparkles, title: "Manque de FAQ IA", hint: "Les moteurs IA citent peu votre entreprise faute de réponses structurées." },
  { icon: Star, title: "Avant/après absents", hint: "Les preuves visuelles augmentent fortement la conversion." },
  { icon: Lightbulb, title: "Spécialisation à clarifier", hint: "Une spécialisation claire améliore le matching IA." },
];

const DEFAULT_TRUST: TrustSignal[] = [
  { icon: ShieldCheck, label: "RBQ validée", active: true },
  { icon: ShieldCheck, label: "Entreprise active", active: true },
  { icon: Star, label: "Avis détectés", active: true },
  { icon: MapPin, label: "Présence locale", active: true },
];

export default function OpportunityInsights({
  city,
  opportunities = DEFAULT_OPPORTUNITIES,
  trustSignals = DEFAULT_TRUST,
  multiplier = 3.2,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Projection IA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Projection IA
          </span>
        </div>
        <p className="text-sm text-foreground leading-snug">
          Les entreprises similaires avec un profil optimisé obtiennent jusqu'à{" "}
          <span className="font-black text-primary">{multiplier.toFixed(1)}x</span> plus de demandes qualifiées
          {city ? <> dans <span className="font-semibold">{city}</span></> : ""}.
        </p>
      </motion.div>

      {/* Opportunités détectées */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          Opportunités détectées
        </h3>
        <div className="grid grid-cols-1 gap-2">
          {opportunities.map((o, i) => {
            const Icon = o.icon;
            return (
              <motion.div
                key={o.title}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 p-3"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-foreground">{o.title}</p>
                  <p className="text-[11.5px] text-muted-foreground leading-snug mt-0.5">{o.hint}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Signaux de confiance */}
      <div>
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-success" />
          Signaux de confiance
        </h3>
        <div className="flex flex-wrap gap-2">
          {trustSignals.map((t) => {
            const Icon = t.icon;
            return (
              <span
                key={t.label}
                className="inline-flex items-center gap-1.5 rounded-full bg-success/10 border border-success/20 px-3 py-1.5 text-[11.5px] font-medium text-success"
              >
                <Icon className="h-3 w-3" />
                {t.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
