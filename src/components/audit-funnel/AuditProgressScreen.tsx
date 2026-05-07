import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, Search, Sparkles, BarChart3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  businessName?: string;
  hasContractor: boolean;
  hasAudit: boolean;
  degraded: boolean;
  pollAttempts: number;
  onContinueAnyway: () => void;
  onRetry: () => void;
  onHome: () => void;
}

export function AuditProgressScreen({
  businessName,
  hasContractor,
  hasAudit,
  degraded,
  pollAttempts,
  onContinueAnyway,
  onRetry,
  onHome,
}: Props) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const steps = [
    { label: "Profil créé", icon: Search, done: hasContractor, active: !hasContractor },
    { label: "Audit lancé", icon: Sparkles, done: hasAudit || degraded, active: hasContractor && !hasAudit && !degraded },
    {
      label: pollAttempts > 0 ? `Analyse en cours (${pollAttempts}/5)` : "Analyse en cours",
      icon: BarChart3,
      done: false,
      active: hasAudit,
    },
  ];

  const showEscape = elapsed >= 4;

  return (
    <div className="max-w-lg mx-auto px-4 pt-20 pb-16 text-center">
      <h2 className="font-display text-2xl font-bold mb-2">Analyse en cours…</h2>
      {businessName && <p className="text-primary font-medium mb-4">{businessName}</p>}
      <p className="text-sm text-muted-foreground mb-8">
        Nous validons vos signaux publics pour produire un score réel, jamais inventé.
      </p>

      {degraded && (
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs text-amber-300">
          <AlertTriangle className="w-3 h-3" /> Certaines données sont indisponibles — on continue.
        </div>
      )}

      <div className="space-y-3 text-left mb-8">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors ${
                step.active ? "bg-primary/10 border border-primary/20" : step.done ? "bg-card/20" : "opacity-60"
              }`}
            >
              {step.done ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              ) : step.active ? (
                <Loader2 className="w-4 h-4 text-primary shrink-0 animate-spin" />
              ) : (
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span className={step.done ? "text-green-300" : step.active ? "text-primary" : "text-muted-foreground"}>
                {step.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mb-4">{elapsed}s écoulées · résultat garanti en moins de 10 s</p>

      {showEscape && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-2"
        >
          <Button onClick={onContinueAnyway} variant="default" size="lg">
            Continuer quand même
          </Button>
          <div className="flex gap-2">
            <Button onClick={onRetry} variant="outline" className="flex-1" size="sm">
              Recommencer
            </Button>
            <Button onClick={onHome} variant="ghost" className="flex-1" size="sm">
              Retour à l'accueil
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
