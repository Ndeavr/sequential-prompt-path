/**
 * UNPRO — TaxCalculatorQuebec
 * Premium glass calculator for TPS (5%) + TVQ (9.975%).
 */
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, RotateCcw, Sparkles, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { trackCopilotEvent } from "@/utils/trackCopilotEvent";

const TPS_RATE = 0.05;
const TVQ_RATE = 0.09975;
const COMBINED = 1 + TPS_RATE + TVQ_RATE; // 1.14975

type Mode = "before" | "included";

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);

export default function TaxCalculatorQuebec() {
  const [mode, setMode] = useState<Mode>("before");
  const [raw, setRaw] = useState<string>("");
  const { toast } = useToast();
  const { openAlex } = useAlexVoice();

  useEffect(() => {
    trackCopilotEvent("tax_calculator_viewed", {});
  }, []);

  const amount = useMemo(() => {
    const n = parseFloat(raw.replace(/[^\d.,-]/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }, [raw]);

  const result = useMemo(() => {
    if (mode === "before") {
      const tps = amount * TPS_RATE;
      const tvq = amount * TVQ_RATE;
      return { subtotal: amount, tps, tvq, total: amount + tps + tvq };
    }
    const subtotal = amount / COMBINED;
    const tps = subtotal * TPS_RATE;
    const tvq = subtotal * TVQ_RATE;
    return { subtotal, tps, tvq, total: amount };
  }, [amount, mode]);

  const onCopy = async () => {
    const text = `Sous-total: ${fmt(result.subtotal)} | TPS (5%): ${fmt(result.tps)} | TVQ (9,975%): ${fmt(result.tvq)} | Total: ${fmt(result.total)}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Calcul copié", description: text });
      trackCopilotEvent("tax_calculator_result_copied", { mode, amount });
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };

  const onReset = () => setRaw("");

  const onModeChange = (m: Mode) => {
    setMode(m);
    trackCopilotEvent("tax_calculator_mode_changed", { mode: m });
  };

  const onCta = () => {
    trackCopilotEvent("tax_calculator_cta_clicked", { mode, amount });
    openAlex("general", { intent: "tax_calculator_home_project", amount, mode } as any);
  };

  return (
    <div className="relative">
      {/* Soft glow */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-60 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent rounded-[2rem]" />

      <div className="glass-card-elevated p-5 sm:p-7 rounded-3xl border border-border/50 shadow-2xl">
        {/* Trust badge */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          <span>Taux TPS/TVQ Québec à jour — 5% + 9,975%</span>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-muted/40 mb-5">
          {([
            { id: "before", label: "Avant taxes" },
            { id: "included", label: "Taxes incluses" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => onModeChange(t.id)}
              className={`relative py-2.5 text-sm font-medium rounded-xl transition-all ${
                mode === t.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="space-y-2">
          <Label htmlFor="tax-amount" className="text-sm">
            {mode === "before" ? "Montant avant taxes" : "Montant taxes incluses"}
          </Label>
          <div className="relative">
            <Input
              id="tax-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0,00"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                trackCopilotEvent("tax_calculator_amount_entered", { mode });
              }}
              className="h-16 text-3xl font-bold pr-12 rounded-2xl"
              aria-label="Montant en dollars"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-muted-foreground font-semibold">
              $
            </span>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-2 gap-2.5 mt-5">
          <ResultCard label={mode === "before" ? "Sous-total" : "Montant avant taxes estimé"} value={fmt(result.subtotal)} />
          <ResultCard label="TPS (5%)" value={fmt(result.tps)} />
          <ResultCard label="TVQ (9,975%)" value={fmt(result.tvq)} />
          <ResultCard label="Total à payer" value={fmt(result.total)} highlight />
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-5">
          <Button onClick={onCopy} variant="outline" className="flex-1 gap-2" disabled={amount <= 0}>
            <Copy className="h-4 w-4" /> Copier le calcul
          </Button>
          <Button onClick={onReset} variant="ghost" className="gap-2" disabled={!raw}>
            <RotateCcw className="h-4 w-4" /> Recommencer
          </Button>
        </div>
      </div>

      {/* Contextual CTA */}
      <AnimatePresence>
        {amount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="font-semibold text-foreground text-sm">
                  Vous calculez des taxes pour une soumission ou des travaux?
                </p>
                <p className="text-xs text-muted-foreground">
                  Alex peut vous aider à vérifier le prix, comparer la facture et trouver un entrepreneur compatible.
                </p>
              </div>
            </div>
            <Button onClick={onCta} className="w-full mt-4 gap-2">
              Analyser mon projet avec Alex <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <motion.div
      key={value}
      initial={{ scale: 0.98, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.18 }}
      className={`rounded-2xl p-4 border ${
        highlight
          ? "bg-primary/15 border-primary/40 shadow-md"
          : "bg-card/60 border-border/40"
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
      <div className={`mt-1 font-bold tabular-nums ${highlight ? "text-xl text-foreground" : "text-lg text-foreground/90"}`}>
        {value}
      </div>
    </motion.div>
  );
}
