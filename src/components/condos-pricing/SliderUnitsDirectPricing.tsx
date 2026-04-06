import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Building2 } from "lucide-react";
import { SNAP_POINTS } from "@/lib/condoDirectPricing";

interface Props {
  units: number;
  onChange: (v: number) => void;
}

export default function SliderUnitsDirectPricing({ units, onChange }: Props) {
  const handleSlider = (val: number[]) => {
    let v = val[0];
    // Snap magnetism (±3)
    for (const sp of SNAP_POINTS) {
      if (Math.abs(v - sp) <= 3) { v = sp; break; }
    }
    onChange(v);
  };

  return (
    <div className="glass-card rounded-2xl p-5 space-y-5 border border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Building2 className="w-4 h-4 text-primary" />
          Nombre d'unités
        </div>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={2}
            max={300}
            value={units}
            onChange={(e) => onChange(Number(e.target.value) || 2)}
            className="w-[72px] h-9 text-center text-sm font-semibold bg-muted/40 border-border/40"
          />
          <span className="text-xs text-muted-foreground">unités</span>
        </div>
      </div>

      <Slider
        value={[units]}
        onValueChange={handleSlider}
        min={2}
        max={300}
        step={1}
        className="py-2"
      />

      {/* Scale markers */}
      <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
        {SNAP_POINTS.map((sp) => (
          <span
            key={sp}
            className={units === sp ? "text-primary font-semibold" : ""}
          >
            {sp}
          </span>
        ))}
        <span className={units >= 250 ? "text-primary font-semibold" : ""}>300</span>
      </div>
    </div>
  );
}
