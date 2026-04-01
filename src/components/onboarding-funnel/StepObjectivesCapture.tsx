/**
 * StepObjectivesCapture — Capture entrepreneur objectives and capacity.
 */
import { motion } from "framer-motion";
import { useState } from "react";
import { Target, ArrowRight } from "lucide-react";

export interface ObjectivesData {
  revenue_target_monthly: number;
  growth_target_percent: number;
  appointments_capacity_weekly: number;
  preferred_project_size: string;
  project_type_preference: string;
}

interface Props {
  city: string;
  activity: string;
  onContinue: (objectives: ObjectivesData) => void;
}

const PROJECT_SIZES = [
  { value: "small", label: "Petits", desc: "< 2 000$" },
  { value: "medium", label: "Moyens", desc: "2 000$ – 10 000$" },
  { value: "large", label: "Gros", desc: "10 000$ – 50 000$" },
  { value: "xlarge", label: "Très gros", desc: "50 000$+" },
];

export default function StepObjectivesCapture({ city, activity, onContinue }: Props) {
  const [obj, setObj] = useState<ObjectivesData>({
    revenue_target_monthly: 15000,
    growth_target_percent: 20,
    appointments_capacity_weekly: 5,
    preferred_project_size: "medium",
    project_type_preference: activity,
  });

  const update = (patch: Partial<ObjectivesData>) => setObj((p) => ({ ...p, ...patch }));

  const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-foreground">Vos objectifs</h2>
        <p className="text-sm text-muted-foreground">
          Alex va calculer le plan optimal pour {activity} à {city}
        </p>
      </div>

      {/* Revenue target */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-xs text-muted-foreground">Objectif revenu mensuel</label>
          <span className="text-sm font-bold text-foreground">{fmt(obj.revenue_target_monthly)}</span>
        </div>
        <input
          type="range"
          min={5000}
          max={100000}
          step={2500}
          value={obj.revenue_target_monthly}
          onChange={(e) => update({ revenue_target_monthly: Number(e.target.value) })}
          className="w-full accent-primary h-2"
        />
      </div>

      {/* Growth */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-xs text-muted-foreground">Croissance souhaitée</label>
          <span className="text-sm font-bold text-foreground">{obj.growth_target_percent}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={obj.growth_target_percent}
          onChange={(e) => update({ growth_target_percent: Number(e.target.value) })}
          className="w-full accent-primary h-2"
        />
      </div>

      {/* Capacity */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <label className="text-xs text-muted-foreground">Rendez-vous par semaine</label>
          <span className="text-sm font-bold text-foreground">{obj.appointments_capacity_weekly}</span>
        </div>
        <input
          type="range"
          min={1}
          max={20}
          step={1}
          value={obj.appointments_capacity_weekly}
          onChange={(e) => update({ appointments_capacity_weekly: Number(e.target.value) })}
          className="w-full accent-primary h-2"
        />
      </div>

      {/* Project size preference */}
      <div className="space-y-2">
        <label className="text-xs text-muted-foreground">Taille de projets préférée</label>
        <div className="grid grid-cols-2 gap-2">
          {PROJECT_SIZES.map((ps) => (
            <button
              key={ps.value}
              onClick={() => update({ preferred_project_size: ps.value })}
              className={`rounded-xl border p-3 text-left transition-all ${
                obj.preferred_project_size === ps.value
                  ? "border-primary bg-primary/10"
                  : "border-border/40 bg-card hover:border-primary/30"
              }`}
            >
              <p className="text-sm font-medium text-foreground">{ps.label}</p>
              <p className="text-xs text-muted-foreground">{ps.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Alex summary */}
      <div className="rounded-xl bg-primary/5 border border-primary/10 p-4">
        <p className="text-xs font-semibold text-primary mb-1">Alex</p>
        <p className="text-sm text-foreground">
          Avec {obj.appointments_capacity_weekly} rendez-vous/semaine et un objectif de {fmt(obj.revenue_target_monthly)}/mois, 
          je vais trouver le plan qui maximise votre conversion.
        </p>
      </div>

      {/* CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onContinue(obj)}
        className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base shadow-lg flex items-center justify-center gap-2"
      >
        <Target className="w-5 h-5" />
        Voir mon plan recommandé
        <ArrowRight className="w-5 h-5" />
      </motion.button>
    </div>
  );
}
