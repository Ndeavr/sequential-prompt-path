import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Building2 } from "lucide-react";
import type { IntakeData } from "@/types/outreachFunnel";

interface Props { onSubmit: (data: IntakeData) => void; }

export function AuditIntakeForm({ onSubmit }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<IntakeData>({ businessName: "", city: "" });
  const [loading, setLoading] = useState(false);

  const steps = [
    { label: "Nom de votre entreprise", field: "businessName" as const, placeholder: "ex: Isolation Solution Royal" },
    { label: "Votre site web ou numéro de téléphone", field: "websiteUrl" as const, placeholder: "ex: isroyal.ca ou 514-555-0123" },
    { label: "Votre ville principale", field: "city" as const, placeholder: "ex: Laval" },
    { label: "Votre email (optionnel)", field: "email" as const, placeholder: "ex: info@isroyal.ca" },
  ];

  const canAdvance = step === 0 ? data.businessName.length >= 2 : step === 2 ? data.city.length >= 2 : true;

  const handleNext = async () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setLoading(true);
      // Detect if step 1 was phone vs website
      const val = data.websiteUrl || "";
      const isPhone = /^\+?\d[\d\s()-]{6,}$/.test(val.trim());
      const finalData = { ...data };
      if (isPhone) {
        finalData.phone = val;
        finalData.websiteUrl = undefined;
      }
      await onSubmit(finalData);
    }
  };

  const current = steps[step];

  return (
    <div className="max-w-md mx-auto px-4 pt-20 pb-16">
      <div className="flex items-center gap-2 mb-8 text-primary">
        <Building2 className="w-5 h-5" />
        <span className="text-sm font-medium">Étape {step + 1} / {steps.length}</span>
      </div>

      <div className="mb-2 flex gap-1">
        {steps.map((_, i) => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-border/30"}`} />
        ))}
      </div>

      <div className="mt-8 space-y-4">
        <Label className="text-lg font-semibold">{current.label}</Label>
        <Input
          autoFocus
          placeholder={current.placeholder}
          value={(data as any)[current.field] || ""}
          onChange={(e) => setData({ ...data, [current.field]: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && canAdvance && handleNext()}
          className="text-base py-6"
        />
        <Button onClick={handleNext} disabled={!canAdvance || loading} className="w-full gap-2 py-6">
          {loading ? "Analyse en cours…" : step < steps.length - 1 ? "Continuer" : "Analyser mon entreprise"}
          <ArrowRight className="w-4 h-4" />
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          L'analyse prend quelques instants et repose uniquement sur des données réellement détectées.
        </p>
      </div>
    </div>
  );
}
