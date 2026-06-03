/**
 * WhyContractorsLose — Strategic narrative block.
 * "Pourquoi les entrepreneurs perdent des contrats" + "Comment UNPRO change le système".
 */
import { motion } from "framer-motion";
import { XCircle, CheckCircle2 } from "lucide-react";
import { entrepreneurMessaging } from "@/lib/copy/entrepreneurs";

export default function WhyContractorsLose() {
  const { whyLost, howUnpro } = entrepreneurMessaging.strategic;

  return (
    <section className="px-5 py-10">
      <div className="max-w-3xl mx-auto grid gap-5 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-5 bg-white/[0.03] backdrop-blur-xl border border-white/10"
        >
          <h3 className="text-sm font-bold text-foreground tracking-tight">
            {whyLost.title}
          </h3>
          <ul className="mt-3 space-y-2">
            {whyLost.causes.map((c) => (
              <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
                <XCircle className="w-3.5 h-3.5 text-destructive/70 mt-0.5 shrink-0" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="rounded-2xl p-5 bg-gradient-to-br from-primary/10 via-white/[0.03] to-accent/10 backdrop-blur-xl border border-primary/20"
        >
          <h3 className="text-sm font-bold text-foreground tracking-tight">
            {howUnpro.title}
          </h3>
          <ul className="mt-3 space-y-2">
            {howUnpro.pillars.map((p) => (
              <li key={p} className="flex items-start gap-2 text-xs text-foreground/85">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
}
