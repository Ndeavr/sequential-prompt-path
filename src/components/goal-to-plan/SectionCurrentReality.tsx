import { GoalInputs } from "@/hooks/useGoalToPlanEngine";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Props {
  inputs: GoalInputs;
  onUpdate: <K extends keyof GoalInputs>(key: K, value: GoalInputs[K]) => void;
  currentRevenue: number | null;
  currentProfit: number | null;
}

const CATEGORIES = [
  "Toiture", "Plomberie", "Électricité", "Asphalte", "Pavé uni",
  "Isolation", "Revêtement", "Excavation", "Portes et fenêtres",
  "Rénovation générale", "Peinture", "Climatisation", "Chauffage",
];

const CITIES = [
  "Montréal", "Québec", "Laval", "Longueuil", "Gatineau",
  "Sherbrooke", "Trois-Rivières", "Saguenay", "Lévis", "Drummondville",
];

export default function SectionCurrentReality({ inputs, onUpdate, currentRevenue, currentProfit }: Props) {
  const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <section id="calculator" className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2 text-foreground">Votre réalité actuelle</h2>
        <p className="text-muted-foreground text-center mb-10">Entrez vos chiffres pour voir votre situation.</p>

        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-6">
          {/* Submissions */}
          <div>
            <Label className="text-sm text-muted-foreground">Soumissions par mois</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider min={1} max={60} step={1} value={[inputs.submissionsPerMonth]} onValueChange={([v]) => onUpdate("submissionsPerMonth", v)} className="flex-1" />
              <span className="text-foreground font-bold w-12 text-right">{inputs.submissionsPerMonth}</span>
            </div>
          </div>

          {/* Close rate */}
          <div>
            <Label className="text-sm text-muted-foreground">Taux de gain (%)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider min={5} max={80} step={1} value={[inputs.closeRatePercent]} onValueChange={([v]) => onUpdate("closeRatePercent", v)} className="flex-1" />
              <span className="text-foreground font-bold w-12 text-right">{inputs.closeRatePercent}%</span>
            </div>
          </div>

          {/* Avg contract */}
          <div>
            <Label className="text-sm text-muted-foreground">Valeur moyenne d'un contrat ($)</Label>
            <Input type="number" value={inputs.avgContractValue} onChange={e => onUpdate("avgContractValue", Number(e.target.value))} className="mt-2 bg-muted/30" />
          </div>

          {/* Profit margin */}
          <div>
            <Label className="text-sm text-muted-foreground">Marge de profit (%)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider min={5} max={60} step={1} value={[inputs.profitMarginPercent]} onValueChange={([v]) => onUpdate("profitMarginPercent", v)} className="flex-1" />
              <span className="text-foreground font-bold w-12 text-right">{inputs.profitMarginPercent}%</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* City */}
            <div>
              <Label className="text-sm text-muted-foreground">Ville</Label>
              <Select value={inputs.city} onValueChange={v => onUpdate("city", v)}>
                <SelectTrigger className="mt-2 bg-muted/30"><SelectValue placeholder="Choisir une ville" /></SelectTrigger>
                <SelectContent>{CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div>
              <Label className="text-sm text-muted-foreground">Domaine</Label>
              <Select value={inputs.category} onValueChange={v => onUpdate("category", v)}>
                <SelectTrigger className="mt-2 bg-muted/30"><SelectValue placeholder="Choisir un domaine" /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Live results */}
        {currentRevenue != null && currentRevenue > 0 && (
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="rounded-xl border border-border/50 bg-card/60 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Revenu / mois</p>
              <p className="text-xl font-bold text-foreground">{fmt(currentRevenue)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/60 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Profit / mois</p>
              <p className="text-xl font-bold text-success">{fmt(currentProfit ?? 0)}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card/60 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Contrats / mois</p>
              <p className="text-xl font-bold text-accent">{Math.round(inputs.submissionsPerMonth * inputs.closeRatePercent / 100)}</p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
