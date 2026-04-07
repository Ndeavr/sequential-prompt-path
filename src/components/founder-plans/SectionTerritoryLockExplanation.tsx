
import { motion } from "framer-motion";
import { Lock, Shield, MapPin } from "lucide-react";

export default function SectionTerritoryLockExplanation() {
  return (
    <section className="px-4 pb-20">
      <div className="max-w-3xl mx-auto space-y-8">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl md:text-3xl font-bold text-center text-foreground"
        >
          Verrouillage territorial
        </motion.h2>

        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 rounded-xl border border-border/30 bg-card/40 backdrop-blur space-y-3"
          >
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h4 className="font-bold text-foreground">Élite Fondateur</h4>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Priorité + accès préférentiel</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> 1 territoire / spécialité</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-primary" /> Dispatch IA prioritaire</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-xl border border-primary/30 bg-gradient-to-b from-primary/5 to-card/40 backdrop-blur space-y-3"
          >
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              <h4 className="font-bold text-foreground">Signature Fondateur</h4>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-accent" /> Verrou complet du territoire</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-accent" /> Exclusivité absolue</li>
              <li className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-accent" /> Aucun concurrent pendant 10 ans</li>
            </ul>
          </motion.div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          1 entrepreneur / territoire / spécialité. Le territoire est verrouillé dès la confirmation du paiement.
        </p>
      </div>
    </section>
  );
}
