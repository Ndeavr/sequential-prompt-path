/**
 * TrustPromiseCards — Two glass cards with the homeowner / contractor promises.
 */
import { motion } from "framer-motion";
import { Home, Briefcase, ShieldCheck, FileText, MapPin, CalendarCheck, UserCheck, XOctagon, TrendingUp, Users, Clock } from "lucide-react";

const FEATURES_HOMEOWNER = [
  { icon: ShieldCheck,  label: "Analyse IA impartiale" },
  { icon: FileText,     label: "Soumissions comparables" },
  { icon: UserCheck,    label: "Pros vérifiés et notés" },
  { icon: CalendarCheck,label: "Réservation sécurisée" },
];

const FEATURES_CONTRACTOR = [
  { icon: Users,        label: "Clients qualifiés" },
  { icon: CalendarCheck,label: "Rendez-vous réels" },
  { icon: XOctagon,     label: "Aucun lead partagé" },
  { icon: TrendingUp,   label: "Croissance durable" },
];

export default function TrustPromiseCards() {
  return (
    <section className="px-5 py-6 grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Homeowners */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="rounded-3xl bg-card/70 backdrop-blur-xl border border-border/40 p-5 shadow-[0_8px_32px_-16px_hsl(var(--primary)/0.2)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Home className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Pour les propriétaires
          </span>
        </div>

        <h3 className="text-lg md:text-xl font-bold text-foreground leading-snug">
          Pas de leads partagés. Pas de magasinage.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          UNPRO vous aide à comprendre le besoin, choisir la bonne solution et réserver le bon professionnel.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {FEATURES_HOMEOWNER.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex flex-col items-center text-center gap-1.5">
                <span className="w-9 h-9 rounded-full bg-muted/40 border border-border/30 flex items-center justify-center text-primary/80">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight">{f.label}</span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Contractors */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-3xl bg-card/70 backdrop-blur-xl border border-border/40 p-5 shadow-[0_8px_32px_-16px_hsl(var(--accent)/0.2)]"
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
            <Briefcase className="w-4 h-4" />
          </span>
          <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
            Pour les entrepreneurs
          </span>
        </div>

        <h3 className="text-lg md:text-xl font-bold text-foreground leading-snug">
          Pas de clics. Pas de leads vendus à 5 ou 6 entrepreneurs.
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Des rendez-vous sérieux avec des clients qualifiés.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {FEATURES_CONTRACTOR.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.label} className="flex flex-col items-center text-center gap-1.5">
                <span className="w-9 h-9 rounded-full bg-muted/40 border border-border/30 flex items-center justify-center text-accent/80">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight">{f.label}</span>
              </div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}
