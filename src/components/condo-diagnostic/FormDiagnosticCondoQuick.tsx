import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowRight, ArrowLeft, Building2 } from "lucide-react";
import type { DiagnosticInput } from "@/lib/condoDiagnosticScoring";

interface Props {
  onComplete: (input: DiagnosticInput) => void;
}

const DOC_ITEMS: { key: keyof DiagnosticInput["docs"]; label: string }[] = [
  { key: "declarationCopropriete", label: "Déclaration de copropriété" },
  { key: "assuranceImmeuble", label: "Assurance immeuble" },
  { key: "etudeReserve", label: "Étude du fonds de prévoyance" },
  { key: "carnetEntretien", label: "Carnet d'entretien" },
  { key: "rapportFinancier", label: "Rapport financier annuel" },
  { key: "pvAssemblee", label: "Procès-verbaux des assemblées" },
];

export default function FormDiagnosticCondoQuick({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [unitCount, setUnitCount] = useState(6);
  const [buildingYear, setBuildingYear] = useState(2000);
  const [docs, setDocs] = useState<DiagnosticInput["docs"]>({
    declarationCopropriete: false,
    assuranceImmeuble: false,
    etudeReserve: false,
    carnetEntretien: false,
    rapportFinancier: false,
    pvAssemblee: false,
  });

  const toggleDoc = (key: keyof DiagnosticInput["docs"]) => {
    setDocs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = () => {
    onComplete({ unitCount, buildingYear, docs });
  };

  const steps = [
    // Step 0: Units
    <div key="units" className="space-y-6">
      <div className="text-center space-y-2">
        <Building2 className="h-10 w-10 text-primary mx-auto" />
        <h3 className="text-lg font-display font-bold text-foreground">
          Combien d'unités dans votre copropriété ?
        </h3>
      </div>
      <div className="space-y-4 px-2">
        <div className="text-center text-3xl font-bold text-primary">{unitCount}</div>
        <Slider
          value={[unitCount]}
          onValueChange={([v]) => setUnitCount(v)}
          min={2}
          max={200}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>2</span><span>200+</span>
        </div>
      </div>
    </div>,

    // Step 1: Year
    <div key="year" className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-display font-bold text-foreground">
          Année de construction
        </h3>
        <p className="text-sm text-muted-foreground">
          L'âge du bâtiment influence les obligations de maintenance.
        </p>
      </div>
      <div className="space-y-4 px-2">
        <div className="text-center text-3xl font-bold text-primary">{buildingYear}</div>
        <Slider
          value={[buildingYear]}
          onValueChange={([v]) => setBuildingYear(v)}
          min={1950}
          max={2026}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1950</span><span>2026</span>
        </div>
      </div>
    </div>,

    // Step 2: Docs
    <div key="docs" className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-display font-bold text-foreground">
          Quels documents possédez-vous ?
        </h3>
        <p className="text-sm text-muted-foreground">
          Cochez les documents disponibles pour votre syndicat.
        </p>
      </div>
      <div className="space-y-3">
        {DOC_ITEMS.map((item) => (
          <label
            key={item.key}
            className="flex items-center gap-3 p-3 rounded-lg glass-card border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
          >
            <Checkbox
              checked={docs[item.key]}
              onCheckedChange={() => toggleDoc(item.key)}
            />
            <span className="text-sm text-foreground">{item.label}</span>
          </label>
        ))}
      </div>
    </div>,
  ];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>

      {steps[step]}

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        )}
        <Button
          className="flex-1 gap-2"
          onClick={step < 2 ? () => setStep(step + 1) : handleSubmit}
        >
          {step < 2 ? (
            <>Suivant <ArrowRight className="h-4 w-4" /></>
          ) : (
            <>Voir mon score <ArrowRight className="h-4 w-4" /></>
          )}
        </Button>
      </div>
    </div>
  );
}
