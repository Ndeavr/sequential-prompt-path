/**
 * UNPRO — Subscription Explainer section
 * Explains the dual model: subscription + extra appointments
 */
import { motion } from "framer-motion";
import { CalendarPlus, Package, TrendingUp, User, Eye, Award, Settings, Zap } from "lucide-react";

const SUBSCRIPTION_INCLUDES = [
  { icon: User, text: "votre profil public" },
  { icon: Eye, text: "votre visibilité sur UNPRO" },
  { icon: Award, text: "votre score AIPP" },
  { icon: Award, text: "vos badges" },
  { icon: TrendingUp, text: "vos outils de conversion" },
  { icon: Zap, text: "vos automatisations" },
  { icon: Settings, text: "votre configuration de territoire, catégories et préférences" },
  { icon: Award, text: "votre accès prioritaire selon le plan" },
];

const FLEXIBILITY_POINTS = [
  "votre capacité réelle",
  "votre saison",
  "vos objectifs mensuels",
  "la valeur moyenne de vos projets",
  "la disponibilité réelle dans votre marché",
];

export default function SubscriptionExplainer() {
  return (
    <section className="px-5 py-16">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Inclusions et rendez-vous supplémentaires</h2>
          <p className="text-muted-foreground mt-2 text-sm max-w-lg mx-auto">
            Un coût fixe pour votre présence. Une flexibilité totale pour croître.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-5">
          {/* Extra appointments explanation */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-border/50 bg-card/50 p-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <CalendarPlus className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-foreground text-sm">Rendez-vous supplémentaires</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Quand vous voulez accélérer, vous pouvez acheter des rendez-vous supplémentaires :
            </p>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-foreground font-medium">à l'unité pour rester agile</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-foreground font-medium">en bloc pour planifier votre croissance</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Cette logique permet d'ajuster vos dépenses à :</p>
            <ul className="mt-2 space-y-1">
              {FLEXIBILITY_POINTS.map((p) => (
                <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary mt-0.5">•</span> {p}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* What subscription includes */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-border/50 bg-card/50 p-5"
          >
            <h3 className="font-bold text-foreground text-sm mb-3">Ce que comprend l'abonnement</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              L'abonnement ne sert pas seulement à recevoir des rendez-vous. Il donne aussi accès à :
            </p>
            <ul className="space-y-2">
              {SUBSCRIPTION_INCLUDES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-xs text-muted-foreground">{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
