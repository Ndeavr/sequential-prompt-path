import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { VERDICT_STYLES, type VerificationVerdict } from "./StatusBadge";

interface FinalVerdictCardProps {
  verdict: VerificationVerdict;
  headline: string;
  summary: string;
  nextSteps?: string[];
}

const VERDICT_LABELS: Record<VerificationVerdict, string> = {
  succes: "Verdict UNPRO : Très rassurant",
  attention: "Verdict UNPRO : Prudence",
  non_succes: "Verdict UNPRO : Non recommandé",
  se_tenir_loin: "Verdict UNPRO : Se tenir loin",
};

export function FinalVerdictCard({ verdict, headline, summary, nextSteps }: FinalVerdictCardProps) {
  const cfg = VERDICT_STYLES[verdict];
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={`relative rounded-2xl border-2 ${cfg.border} overflow-hidden ${cfg.glow}`}>
        {/* Gradient bg */}
        <div className={`absolute inset-0 ${cfg.bg} opacity-40 pointer-events-none`} />
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, hsl(var(--${verdict === "succes" ? "success" : verdict === "attention" ? "warning" : "destructive"}) / 0.15), transparent 60%)`,
          }}
        />

        <div className="relative z-10 p-6 md:p-8">
          {/* Top icon row */}
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 15 }}
              className={`w-12 h-12 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center`}
            >
              <Icon className={`w-6 h-6 ${cfg.color}`} />
            </motion.div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                Verdict final
              </p>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className={`text-base font-bold font-display ${cfg.color}`}
              >
                {VERDICT_LABELS[verdict]}
              </motion.p>
            </div>
          </div>

          {/* Shield divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border/50" />
            <Shield className="w-4 h-4 text-muted-foreground/40" />
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {/* Content */}
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-sm font-bold text-foreground mb-2"
          >
            {headline}
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-muted-foreground leading-relaxed mb-4"
          >
            {summary}
          </motion.p>

          {/* Next steps */}
          {nextSteps && nextSteps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-2"
            >
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Prochaines étapes
              </p>
              {nextSteps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="flex items-start gap-2 text-xs text-foreground"
                >
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.bg} border ${cfg.border}`} />
                  {step}
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
