import { GoalInputs } from "@/hooks/useGoalToPlanEngine";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target } from "lucide-react";

interface Props {
  inputs: GoalInputs;
  onUpdate: <K extends keyof GoalInputs>(key: K, value: GoalInputs[K]) => void;
}

export default function SectionObjectives({ inputs, onUpdate }: Props) {
  const fmt = (n: number) => n.toLocaleString("fr-CA", { maximumFractionDigits: 0 });

  return (
    <section className="py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <Target className="w-6 h-6 text-accent mx-auto mb-3" />
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Vos objectifs</h2>
          <p className="text-muted-foreground">Définissez ce que vous voulez atteindre.</p>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-6 space-y-6">
          {/* Revenue target */}
          <div>
            <Label className="text-sm text-muted-foreground">Revenu mensuel visé ($)</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider min={10000} max={200000} step={5000} value={[inputs.revenueTargetMonthly]} onValueChange={([v]) => onUpdate("revenueTargetMonthly", v)} className="flex-1" />
              <span className="text-foreground font-bold w-24 text-right">{fmt(inputs.revenueTargetMonthly)} $</span>
            </div>
          </div>

          {/* Capacity */}
          <div>
            <Label className="text-sm text-muted-foreground">Rendez-vous possibles par semaine</Label>
            <div className="flex items-center gap-4 mt-2">
              <Slider min={1} max={20} step={1} value={[inputs.appointmentsCapacityWeekly]} onValueChange={([v]) => onUpdate("appointmentsCapacityWeekly", v)} className="flex-1" />
              <span className="text-foreground font-bold w-12 text-right">{inputs.appointmentsCapacityWeekly}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project size pref */}
            <div>
              <Label className="text-sm text-muted-foreground">Taille de projets préférée</Label>
              <Select value={inputs.preferredProjectSize} onValueChange={v => onUpdate("preferredProjectSize", v as GoalInputs["preferredProjectSize"])}>
                <SelectTrigger className="mt-2 bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="xs">Très petits (XS)</SelectItem>
                  <SelectItem value="s">Petits (S)</SelectItem>
                  <SelectItem value="m">Moyens (M)</SelectItem>
                  <SelectItem value="l">Gros (L)</SelectItem>
                  <SelectItem value="xl">Très gros (XL)</SelectItem>
                  <SelectItem value="xxl">Majeurs (XXL)</SelectItem>
                  <SelectItem value="mixed">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Lead quality pref */}
            <div>
              <Label className="text-sm text-muted-foreground">Préférence</Label>
              <Select value={inputs.preferredLeadQuality} onValueChange={v => onUpdate("preferredLeadQuality", v as GoalInputs["preferredLeadQuality"])}>
                <SelectTrigger className="mt-2 bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="volume">Plus de volume</SelectItem>
                  <SelectItem value="quality">Plus de qualité</SelectItem>
                  <SelectItem value="balanced">Équilibré</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
