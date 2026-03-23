import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Shield, ShieldCheck, Search, Camera, CheckCircle2, AlertTriangle, XCircle, Ban, Loader2,
} from "lucide-react";

/* ── Demo lines ── */
const DEMO_LINES = [
  { label: "Validation RBQ…", verdict: "succes" as const },
  { label: "Validation entreprise…", verdict: "succes" as const },
  { label: "Analyse téléphone…", verdict: "attention" as const },
  { label: "Analyse contrat…", verdict: "succes" as const },
  { label: "Verdict UNPRO…", verdict: "succes" as const },
];

const VERDICT_CFG = {
  succes: { label: "Succès", Icon: CheckCircle2, cls: "text-success bg-success/10 border-success/25" },
  attention: { label: "Attention", Icon: AlertTriangle, cls: "text-warning bg-warning/10 border-warning/25" },
  non_succes: { label: "Non-succès", Icon: XCircle, cls: "text-destructive bg-destructive/10 border-destructive/25" },
  se_tenir_loin: { label: "Se tenir loin", Icon: Ban, cls: "text-destructive bg-destructive/15 border-destructive/30" },
} as const;

/* ── Animated line ── */
function DemoLine({ label, verdict, state }: { label: string; verdict: keyof typeof VERDICT_CFG; state: "idle" | "loading" | "done" }) {
  const cfg = VERDICT_CFG[verdict];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex items-center justify-between gap-3 py-1.5"
    >
      <span className={`text-[11px] font-medium ${state === "done" ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>

      <AnimatePresence mode="wait">
        {state === "loading" && (
          <motion.span key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
          </motion.span>
        )}
        {state === "done" && (
          <motion.span
            key="badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 22 }}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold border ${cfg.cls}`}
          >
            <cfg.Icon className="h-2.5 w-2.5" />
            {cfg.label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── Main component ── */
const VerificationFeatureCard = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [step, setStep] = useState(-1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const run = useCallback(() => {
    setStep(0);
    let i = 0;
    const tick = () => {
      i++;
      if (i <= DEMO_LINES.length) {
        setStep(i);
        timerRef.current = setTimeout(tick, 900 + Math.random() * 500);
      } else {
        timerRef.current = setTimeout(() => { setStep(-1); timerRef.current = setTimeout(run, 1200); }, 3000);
      }
    };
    timerRef.current = setTimeout(tick, 900 + Math.random() * 400);
  }, []);

  useEffect(() => {
    const t = setTimeout(run, 600);
    return () => { clearTimeout(t); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [run]);

  const lineState = (i: number) => (step < 0 ? "idle" : i < step ? "done" : i === step ? "loading" : "idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(query.trim() ? `/verify?q=${encodeURIComponent(query.trim())}` : "/verify");
  };

  return (
    <section className="px-5 py-14">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glass card */}
          <div className="relative rounded-2xl overflow-hidden border border-border/60 bg-card/80 backdrop-blur-xl shadow-[var(--shadow-lg)]">
            {/* Ambient glow */}
            <div className="absolute -top-24 -right-16 w-56 h-56 rounded-full blur-[90px] bg-primary/10 pointer-events-none" />
            <div className="absolute -bottom-20 -left-12 w-44 h-44 rounded-full blur-[70px] bg-warning/8 pointer-events-none" />

            <div className="relative z-10 p-5 sm:p-7">
              {/* Header */}
              <div className="flex items-center gap-2.5 mb-1">
                <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 border border-primary/15">
                  <Shield className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-display text-base sm:text-lg font-bold text-foreground leading-tight">
                  Vérifier un entrepreneur
                </h3>
              </div>

              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1.5 mb-5 max-w-md leading-relaxed">
                Nom, téléphone, RBQ, NEQ, contrat ou photo de camion&nbsp;: UNPRO recoupe les indices avant que vous signiez.
              </p>

              <div className="grid md:grid-cols-2 gap-4 items-start">
                {/* Left — input + CTAs */}
                <div className="space-y-3">
                  <form onSubmit={handleSubmit} className="space-y-2.5">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Nom, téléphone, RBQ ou NEQ"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-9 h-10 rounded-xl border-border/60 bg-background/80 text-xs"
                      />
                    </div>
                    <Button type="submit" className="w-full h-10 rounded-xl text-xs font-bold gap-1.5 cta-gradient">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Vérifier maintenant
                    </Button>
                  </form>
                  <button
                    onClick={() => navigate("/verify")}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                  >
                    <Camera className="h-3 w-3" />
                    Téléverser une photo
                  </button>
                </div>

                {/* Right — animated demo */}
                <div className="rounded-xl bg-muted/30 border border-border/40 p-3.5 min-h-[160px]">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    Vérification en cours
                  </p>
                  <div className="divide-y divide-border/30">
                    {DEMO_LINES.map((line, i) => {
                      const s = lineState(i);
                      return s !== "idle" ? (
                        <DemoLine key={line.label} label={line.label} verdict={line.verdict} state={s} />
                      ) : null;
                    })}
                  </div>

                  {/* Shimmer bar while running */}
                  {step >= 0 && step <= DEMO_LINES.length && (
                    <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-muted/40 mt-2.5">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
                        animate={{ width: ["0%", "60%", "40%", "80%"], x: ["0%", "10%", "30%", "20%"] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default VerificationFeatureCard;
