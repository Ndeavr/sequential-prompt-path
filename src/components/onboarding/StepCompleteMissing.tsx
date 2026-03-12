import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Wrench, MapPin, Award, Camera, Target, ChevronRight, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ImportedBusinessData } from "@/services/businessImportService";

interface Props {
  data: ImportedBusinessData;
  onContinue: (updates: Record<string, string>) => void;
}

export default function StepCompleteMissing({ data, onContinue }: Props) {
  const [updates, setUpdates] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setUpdates(p => ({ ...p, [k]: v }));

  // Count completion
  const allFields = Object.values(data);
  const filled = allFields.filter(f => f.state !== "missing").length + Object.keys(updates).length;
  const pct = Math.min(100, Math.round((filled / allFields.length) * 100));

  const groups = [
    { icon: Shield, label: "Business Trust", fields: [
      { key: "licenseNumber", label: "RBQ / License number", placeholder: "e.g. 1234-5678-90", missing: data.licenseNumber.state === "missing" },
      { key: "insuranceInfo", label: "Insurance status", placeholder: "e.g. Responsabilité civile 2M$", missing: data.insuranceInfo.state === "missing" },
      { key: "yearsExperience", label: "Years in business", placeholder: "e.g. 12", missing: data.yearsExperience.state === "missing" },
      { key: "warranties", label: "Warranty offered", placeholder: "e.g. 5 ans main-d'œuvre", missing: data.warranties.state === "missing" },
    ]},
    { icon: Wrench, label: "Services", fields: [
      { key: "specialties", label: "Specialties", placeholder: "e.g. Plomberie urgence, rénovation salle de bain", missing: true },
      { key: "languages", label: "Languages spoken", placeholder: "e.g. Français, English", missing: data.languages.state !== "imported" },
    ]},
    { icon: MapPin, label: "Service Area", fields: [
      { key: "cities", label: "Cities served", placeholder: "e.g. Montréal, Laval, Longueuil", missing: data.serviceArea.state !== "imported" },
      { key: "emergencyService", label: "Emergency 24/7?", placeholder: "Yes / No", missing: data.emergencyService.state === "missing" },
    ]},
    { icon: Target, label: "Objectives", fields: [
      { key: "monthlyObjective", label: "Desired monthly leads", placeholder: "e.g. 20", missing: true },
      { key: "targetRegion", label: "Target growth region", placeholder: "e.g. Rive-Sud", missing: true },
    ]},
  ];

  return (
    <div className="dark min-h-screen px-4 py-12">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">Complete Missing Info</h2>
          <p className="text-sm text-muted-foreground">Only what's missing or uncertain — we prefilled the rest.</p>
        </motion.div>

        {/* Completion meter */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 flex items-center gap-4">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
              <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
              <circle cx="28" cy="28" r="24" fill="none" stroke="hsl(var(--primary))" strokeWidth="4"
                strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - pct / 100)} strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground">{pct}%</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Profile completion</p>
            <p className="text-xs text-muted-foreground">{pct >= 80 ? "Almost there!" : "Fill missing info to boost your AIPP score."}</p>
          </div>
        </motion.div>

        {/* Groups */}
        <div className="space-y-4">
          {groups.map((group, gi) => {
            const missingFields = group.fields.filter(f => f.missing);
            if (missingFields.length === 0) return null;
            return (
              <motion.div
                key={gi}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + gi * 0.08 }}
                className="rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  <group.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">{group.label}</span>
                </div>
                {missingFields.map(f => (
                  <div key={f.key} className="space-y-1">
                    <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      {f.label}
                      <AlertCircle className="w-3 h-3 text-warning" />
                    </label>
                    <Input
                      placeholder={f.placeholder}
                      value={updates[f.key] || ""}
                      onChange={e => set(f.key, e.target.value)}
                      className="h-10 bg-muted/30 border-border/50 rounded-xl text-sm"
                    />
                  </div>
                ))}
              </motion.div>
            );
          })}
        </div>

        <Button onClick={() => onContinue(updates)} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 border-0 rounded-xl gap-2">
          Calculate my AIPP <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
