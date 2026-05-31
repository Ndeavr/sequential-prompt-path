import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

export interface GrowthProfileInput {
  monthly_capacity: number;
  avg_ticket_cents: number;
  teams_count: number;
  target_growth_percent: number;
  preferred_job_types: string[];
  preferred_territories: string[];
  wants_exclusivity: boolean;
  max_distance_km: number;
  quality_vs_volume: number;
  seasonality_notes?: string;
}

const TRADES = ["plomberie", "electricite", "isolation", "toiture", "renovation", "cvc", "peinture"];
const TERRITORIES = ["Montréal", "Laval", "Terrebonne", "Longueuil", "Brossard", "Repentigny"];

export function GrowthProfileWizard({ onComplete }: { onComplete: (p: GrowthProfileInput) => void }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<GrowthProfileInput>({
    monthly_capacity: 10,
    avg_ticket_cents: 250_000,
    teams_count: 1,
    target_growth_percent: 30,
    preferred_job_types: [],
    preferred_territories: [],
    wants_exclusivity: false,
    max_distance_km: 50,
    quality_vs_volume: 60,
  });

  const steps = [
    {
      title: "Combien de projets pouvez-vous gérer par mois ?",
      content: (
        <div className="space-y-6">
          <div className="text-5xl font-semibold text-white text-center">{p.monthly_capacity}</div>
          <Slider value={[p.monthly_capacity]} min={1} max={100} step={1}
            onValueChange={(v) => setP({ ...p, monthly_capacity: v[0] })} />
          <div className="flex justify-between text-xs text-white/50"><span>1</span><span>100</span></div>
        </div>
      ),
    },
    {
      title: "Quel est votre ticket moyen ?",
      content: (
        <div className="space-y-6">
          <div className="text-5xl font-semibold text-white text-center">
            ${(p.avg_ticket_cents / 100).toLocaleString("fr-CA")}
          </div>
          <Slider value={[p.avg_ticket_cents]} min={50_000} max={5_000_000} step={25_000}
            onValueChange={(v) => setP({ ...p, avg_ticket_cents: v[0] })} />
          <div className="flex justify-between text-xs text-white/50"><span>$500</span><span>$50k+</span></div>
        </div>
      ),
    },
    {
      title: "Combien d'équipes avez-vous ?",
      content: (
        <div className="space-y-6">
          <div className="text-5xl font-semibold text-white text-center">{p.teams_count}</div>
          <Slider value={[p.teams_count]} min={1} max={20} step={1}
            onValueChange={(v) => setP({ ...p, teams_count: v[0] })} />
        </div>
      ),
    },
    {
      title: "Quels services voulez-vous prioriser ?",
      content: (
        <div className="flex flex-wrap gap-2 justify-center">
          {TRADES.map((t) => {
            const active = p.preferred_job_types.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  setP({
                    ...p,
                    preferred_job_types: active
                      ? p.preferred_job_types.filter((x) => x !== t)
                      : [...p.preferred_job_types, t],
                  })
                }
                className={`px-4 py-2 rounded-full border text-sm transition-all ${
                  active
                    ? "bg-[hsl(210,100%,65%)] border-[hsl(210,100%,65%)] text-black"
                    : "border-white/15 text-white/80 hover:border-white/40"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Quels territoires desservez-vous ?",
      content: (
        <div className="flex flex-wrap gap-2 justify-center">
          {TERRITORIES.map((t) => {
            const active = p.preferred_territories.includes(t);
            return (
              <button
                key={t}
                onClick={() =>
                  setP({
                    ...p,
                    preferred_territories: active
                      ? p.preferred_territories.filter((x) => x !== t)
                      : [...p.preferred_territories, t],
                  })
                }
                className={`px-4 py-2 rounded-full border text-sm transition-all ${
                  active
                    ? "bg-[hsl(210,100%,65%)] border-[hsl(210,100%,65%)] text-black"
                    : "border-white/15 text-white/80 hover:border-white/40"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Objectif de croissance ?",
      content: (
        <div className="space-y-6">
          <div className="text-5xl font-semibold text-white text-center">+{p.target_growth_percent}%</div>
          <Slider value={[p.target_growth_percent]} min={0} max={200} step={5}
            onValueChange={(v) => setP({ ...p, target_growth_percent: v[0] })} />
        </div>
      ),
    },
    {
      title: "Voulez-vous une exclusivité territoriale ?",
      content: (
        <div className="space-y-6 text-center">
          <p className="text-white/70 text-sm">
            L'exclusivité bloque vos compétiteurs sur vos territoires choisis. Premium appliqué selon disponibilité.
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className={p.wants_exclusivity ? "text-white/40" : "text-white"}>Non</span>
            <Switch checked={p.wants_exclusivity} onCheckedChange={(v) => setP({ ...p, wants_exclusivity: v })} />
            <span className={p.wants_exclusivity ? "text-white" : "text-white/40"}>Oui</span>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[step];
  const last = step === steps.length - 1;
  const canNext =
    step !== 3 || p.preferred_job_types.length > 0
      ? step !== 4 || p.preferred_territories.length > 0
      : false;

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="mb-8">
        <div className="flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= step ? "bg-[hsl(210,100%,65%)]" : "bg-white/10"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 text-xs text-white/40">Étape {step + 1} / {steps.length}</div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2 className="text-2xl md:text-3xl font-semibold text-white tracking-tight mb-8 text-center">
            {current.title}
          </h2>
          <div className="mb-10">{current.content}</div>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep(step - 1)} className="flex-1 text-white/70">
            Précédent
          </Button>
        )}
        <Button
          disabled={!canNext}
          onClick={() => {
            if (last) onComplete(p);
            else setStep(step + 1);
          }}
          className="flex-1 bg-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,70%)] text-black font-medium"
        >
          {last ? "Générer mon plan IA" : "Suivant"}
        </Button>
      </div>
    </div>
  );
}
