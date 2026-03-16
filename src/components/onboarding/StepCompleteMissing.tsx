import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, Wrench, MapPin, Award, Camera, Target, ChevronRight, AlertCircle, Check, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PremiumMagneticButton } from "@/components/ui/PremiumMagneticButton";
import type { ImportedBusinessData } from "@/services/businessImportService";

interface Props {
  data: ImportedBusinessData;
  onContinue: (updates: Record<string, string>) => void;
}

export default function StepCompleteMissing({ data, onContinue }: Props) {
  const [updates, setUpdates] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setUpdates(p => ({ ...p, [k]: v }));

  const allFields = Object.values(data);
  const filled = allFields.filter(f => f.state !== "missing").length + Object.keys(updates).filter(k => updates[k]?.trim()).length;
  const pct = Math.min(100, Math.round((filled / allFields.length) * 100));

  const groups = [
    { icon: Shield, label: "Business Trust", sublabel: "Builds credibility with homeowners", accent: "text-success", fields: [
      { key: "licenseNumber", label: "RBQ / License number", placeholder: "e.g. 1234-5678-90", missing: data.licenseNumber.state === "missing", impact: "+8 AIPP" },
      { key: "insuranceInfo", label: "Insurance status", placeholder: "e.g. Responsabilité civile 2M$", missing: data.insuranceInfo.state === "missing", impact: "+6 AIPP" },
      { key: "yearsExperience", label: "Years in business", placeholder: "e.g. 12", missing: data.yearsExperience.state === "missing", impact: "+3 AIPP" },
      { key: "warranties", label: "Warranty offered", placeholder: "e.g. 5 ans main-d'œuvre", missing: data.warranties.state === "missing", impact: "+4 AIPP" },
    ]},
    { icon: Wrench, label: "Services", sublabel: "Improves matching accuracy", accent: "text-primary", fields: [
      { key: "specialties", label: "Specialties", placeholder: "e.g. Plomberie urgence, rénovation salle de bain", missing: true, impact: "+5 AIPP" },
      { key: "languages", label: "Languages spoken", placeholder: "e.g. Français, English", missing: data.languages.state !== "imported", impact: "+2 AIPP" },
    ]},
    { icon: MapPin, label: "Service Area", sublabel: "Unlocks local visibility", accent: "text-accent", fields: [
      { key: "cities", label: "Cities served", placeholder: "e.g. Montréal, Laval, Longueuil", missing: data.serviceArea.state !== "imported", impact: "+6 AIPP" },
      { key: "emergencyService", label: "Emergency 24/7?", placeholder: "Yes / No", missing: data.emergencyService.state === "missing", impact: "+3 AIPP" },
    ]},
    { icon: Target, label: "Growth Objectives", sublabel: "Powers your personalized plan", accent: "text-secondary", fields: [
      { key: "monthlyObjective", label: "Desired monthly appointments", placeholder: "e.g. 20", missing: true, impact: "" },
      { key: "targetRegion", label: "Target growth region", placeholder: "e.g. Rive-Sud", missing: true, impact: "" },
    ]},
  ];

  return (
    <div className="dark min-h-screen px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Complete Your Profile
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            We prefilled everything we found. Just fill what's missing — each field boosts your score.
          </p>
        </motion.div>

        {/* Premium completion meter */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          className="rounded-2xl border border-border/50 bg-gradient-to-r from-card/80 to-card/40 backdrop-blur-xl p-5 flex items-center gap-5 shadow-[var(--shadow-lg)]">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg viewBox="0 0 64 64" className="w-16 h-16 -rotate-90">
              <circle cx="32" cy="32" r="27" fill="none" stroke="hsl(var(--muted)/0.3)" strokeWidth="5" />
              <motion.circle
                cx="32" cy="32" r="27" fill="none" stroke="url(#completionGrad)" strokeWidth="5"
                strokeDasharray={2 * Math.PI * 27}
                strokeDashoffset={2 * Math.PI * 27 * (1 - pct / 100)}
                strokeLinecap="round"
                initial={{ strokeDashoffset: 2 * Math.PI * 27 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 27 * (1 - pct / 100) }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="completionGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="hsl(var(--success))" />
                </linearGradient>
              </defs>
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-foreground">{pct}%</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-foreground">Profile Completion</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pct >= 90 ? "🔥 Almost perfect!" : pct >= 70 ? "⚡ Looking great — a few more to max out." : "Fill missing info to unlock your full potential."}
            </p>
            {pct < 90 && (
              <p className="text-[10px] text-primary mt-1 font-medium">
                +{Math.round((100 - pct) * 0.6)} potential AIPP points available
              </p>
            )}
          </div>
        </motion.div>

        {/* Groups */}
        <div className="space-y-3">
          {groups.map((group, gi) => {
            const missingFields = group.fields.filter(f => f.missing);
            if (missingFields.length === 0) return null;
            const allFilled = missingFields.every(f => updates[f.key]?.trim());
            return (
              <motion.div
                key={gi}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + gi * 0.08 }}
                className={`rounded-xl border backdrop-blur-sm p-4 space-y-3 transition-all duration-300 ${
                  allFilled
                    ? "border-success/20 bg-success/[0.03]"
                    : "border-border/40 bg-card/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center ${group.accent}`}>
                    <group.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-semibold text-foreground">{group.label}</span>
                    <p className="text-[10px] text-muted-foreground/60">{group.sublabel}</p>
                  </div>
                  {allFilled && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center">
                      <Check className="w-3 h-3 text-success" />
                    </motion.div>
                  )}
                </div>
                {missingFields.map(f => (
                  <div key={f.key} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {f.label}
                        {!updates[f.key]?.trim() && <AlertCircle className="w-3 h-3 text-warning/70" />}
                      </label>
                      {f.impact && <span className="text-[9px] text-primary font-semibold">{f.impact}</span>}
                    </div>
                    <Input
                      placeholder={f.placeholder}
                      value={updates[f.key] || ""}
                      onChange={e => set(f.key, e.target.value)}
                      className="h-10 bg-muted/15 border-border/30 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:border-primary/30 transition-all"
                    />
                  </div>
                ))}
              </motion.div>
            );
          })}
        </div>

        <PremiumMagneticButton
          onReleaseAction={() => onContinue(updates)}
          variant="indigo"
          fullWidth
          iconRight={<ChevronRight className="w-4 h-4" />}
          className="h-13 text-base font-semibold"
        >
          <Sparkles className="w-4 h-4" />
          Calculate my AIPP Score
        </PremiumMagneticButton>
      </div>
    </div>
  );
}
