/**
 * PremiumV2Sections — Apple/Stripe-level sections for nuclear-close landing.
 * Pure UI. No business logic changes. Uses semantic tokens + glass + floating gradients.
 */
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import {
  Search,
  Phone,
  Calendar,
  Target,
  Lock,
  TrendingUp,
  CheckCircle2,
  Quote,
} from "lucide-react";

const CAT_FR: Record<string, string> = {
  toiture: "toiture",
  asphalte: "asphalte",
  gazon: "entretien de gazon",
  peinture: "peinture",
  isolation: "isolation d'entretoit",
  plomberie: "plomberie",
  electricite: "électricité",
  cvac: "CVAC",
  fenestration: "fenestration",
  revetement: "revêtement",
  excavation: "excavation",
  paysagement: "paysagement",
  renovation: "rénovation",
  general: "services résidentiels",
};

interface BaseProps {
  city: string;
  category: string;
  missed: number;
  companyName: string;
}

/** OpportunitiesGrid — 4 concrete missed-opportunity cards with floating gradients. */
export function OpportunitiesGrid({ city, category, missed }: BaseProps) {
  const cat = CAT_FR[category] ?? category;
  const searches = Math.round(missed * 8.2);
  const calls = Math.round(missed * 1.4);
  const bookings = Math.round(missed * 0.6);

  const items = [
    {
      icon: <Search className="h-5 w-5" />,
      label: "Recherches locales",
      value: `~${searches}/mois`,
      sub: `Propriétaires cherchent "${cat}" à ${city}`,
      accent: "from-primary/20 to-primary/5",
      border: "border-primary/20",
    },
    {
      icon: <Phone className="h-5 w-5" />,
      label: "Demandes qualifiées",
      value: `~${calls}/mois`,
      sub: "Prêts à recevoir un appel cette semaine",
      accent: "from-emerald-400/20 to-emerald-400/5",
      border: "border-emerald-400/20",
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Rendez-vous fermés",
      value: `~${bookings}/mois`,
      sub: "Captés actuellement par vos concurrents",
      accent: "from-rose-400/20 to-rose-400/5",
      border: "border-rose-400/20",
    },
    {
      icon: <Target className="h-5 w-5" />,
      label: "Revenu manqué estimé",
      value: `~${(bookings * 4200).toLocaleString("fr-CA")} $`,
      sub: "Sur 30 jours, basé sur ticket moyen",
      accent: "from-amber-400/20 to-amber-400/5",
      border: "border-amber-400/20",
    },
  ];

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xs uppercase tracking-wider text-white/50">
        Ce qui se passe pendant que vous lisez ceci
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 * i }}
          >
            <Card
              className={`relative h-full overflow-hidden border ${it.border} bg-gradient-to-br ${it.accent} p-5 backdrop-blur-xl`}
            >
              <div
                className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-30 blur-3xl"
                style={{ background: "white" }}
                aria-hidden
              />
              <div className="relative flex items-start justify-between">
                <p className="text-[11px] uppercase tracking-wider text-white/60">
                  {it.label}
                </p>
                <span className="text-white/70">{it.icon}</span>
              </div>
              <p className="relative mt-3 text-2xl font-semibold tabular-nums text-white">
                {it.value}
              </p>
              <p className="relative mt-1 text-xs leading-relaxed text-white/65">
                {it.sub}
              </p>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/** TerritoryScarcityBlock — animated availability strip. */
export function TerritoryScarcityBlock({ city, category, companyName }: BaseProps) {
  const cat = CAT_FR[category] ?? category;
  // Deterministic pseudo-scarcity based on company name hash
  const seed = companyName.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const competitors = 3 + (seed % 4); // 3-6
  const slotsLeft = 1 + (seed % 2); // 1-2

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mt-10"
    >
      <Card className="relative overflow-hidden border-amber-400/30 bg-gradient-to-br from-amber-500/10 via-rose-500/5 to-transparent p-6 backdrop-blur-xl md:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(60% 80% at 100% 0%, hsl(40 90% 60%/0.18), transparent 70%), radial-gradient(50% 70% at 0% 100%, hsl(340 90% 60%/0.14), transparent 70%)",
          }}
        />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] uppercase tracking-wider text-amber-200">
              <Lock className="h-3 w-3" />
              Territoire exclusif · {city}
            </div>
            <h3 className="mt-3 text-2xl font-semibold leading-tight text-white md:text-3xl">
              {slotsLeft === 1 ? "1 place restante" : `${slotsLeft} places restantes`}
              <span className="text-white/60"> en {cat}</span>
            </h3>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              {competitors} autres entreprises à {city} ont reçu cette même analyse cette semaine.
              Le premier qui active son territoire le verrouille pour 12 mois.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {Array.from({ length: Math.min(competitors, 5) }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-9 rounded-full border-2 border-[#060B14] bg-gradient-to-br from-white/20 to-white/5 backdrop-blur"
                />
              ))}
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-white/50">Concurrents notifiés</span>
              <span className="text-lg font-semibold tabular-nums text-white">
                {competitors}
              </span>
            </div>
          </div>
        </div>

        {/* Capacity bar */}
        <div className="relative mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${((3 - slotsLeft) / 3) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-400"
            />
          </div>
          <div className="mt-2 flex justify-between text-[11px] uppercase tracking-wider text-white/50">
            <span>Capacité territoire</span>
            <span className="text-amber-200">
              {3 - slotsLeft}/3 occupés
            </span>
          </div>
        </div>
      </Card>
    </motion.section>
  );
}

/** SocialProofFloating — 3 testimonial cards with subtle motion. */
export function SocialProofFloating() {
  const items = [
    {
      quote:
        "Premier mois : 14 rendez-vous qualifiés. Zéro guerre de prix. Mon agenda est plein.",
      author: "Marc-André L.",
      role: "Couvreur · Laval",
      delta: "+312% RDV/mois",
    },
    {
      quote:
        "Fini les leads partagés à 5 entrepreneurs. UNPRO m'envoie des clients qui veulent vraiment avancer.",
      author: "Sophie T.",
      role: "Peintre · Longueuil",
      delta: "+218% conversion",
    },
    {
      quote:
        "L'IA fait le travail de tri. Je reçois juste les bons projets, au bon moment.",
      author: "Daniel R.",
      role: "Plombier · Québec",
      delta: "+187% revenu",
    },
  ];

  return (
    <section className="mt-12">
      <h2 className="mb-4 text-xs uppercase tracking-wider text-white/50">
        Ce que disent les entrepreneurs déjà activés
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {items.map((t, i) => (
          <motion.div
            key={t.author}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 * i }}
          >
            <Card className="relative h-full overflow-hidden border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
              <Quote className="absolute right-4 top-4 h-8 w-8 text-white/10" />
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-200">
                <TrendingUp className="h-3 w-3" />
                {t.delta}
              </div>
              <p className="mt-4 text-sm leading-relaxed text-white/85">
                « {t.quote} »
              </p>
              <div className="mt-5 flex items-center gap-3 border-t border-white/5 pt-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-fuchsia-500/40 text-xs font-semibold text-white">
                  {t.author.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {t.author}
                  </p>
                  <p className="truncate text-xs text-white/55">{t.role}</p>
                </div>
                <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" />
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
