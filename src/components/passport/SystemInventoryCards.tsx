/**
 * UNPRO — System Inventory Cards
 * Track property systems with status, age, and missing data indicators.
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Home, Droplets, Flame, Zap, Wind, GlassWater, Layers,
  CircleDashed, AlertTriangle, CheckCircle,
} from "lucide-react";

export interface SystemEntry {
  key: string;
  label: string;
  icon: React.ElementType;
  value?: string | null;
  year?: number | null;
  lifespan?: number;
}

const SYSTEM_DEFINITIONS: Omit<SystemEntry, "value" | "year">[] = [
  { key: "roof", label: "Toiture", icon: Home, lifespan: 25 },
  { key: "insulation", label: "Isolation", icon: Layers, lifespan: 40 },
  { key: "windows", label: "Fenêtres", icon: GlassWater, lifespan: 30 },
  { key: "heating", label: "Chauffage", icon: Flame, lifespan: 20 },
  { key: "plumbing", label: "Plomberie", icon: Droplets, lifespan: 40 },
  { key: "electrical", label: "Électricité", icon: Zap, lifespan: 40 },
  { key: "foundation", label: "Fondation", icon: Home, lifespan: 75 },
  { key: "drainage", label: "Drainage", icon: GlassWater, lifespan: 30 },
  { key: "ventilation", label: "Ventilation", icon: Wind, lifespan: 20 },
];

interface Props {
  sectionData: Record<string, unknown>;
}

const currentYear = new Date().getFullYear();

function getAgeStatus(year: number | null | undefined, lifespan = 25) {
  if (!year) return null;
  const age = currentYear - year;
  const ratio = age / lifespan;
  if (ratio <= 0.5) return { label: "Bon état", color: "text-success", bg: "bg-success/10" };
  if (ratio <= 0.8) return { label: "À surveiller", color: "text-warning", bg: "bg-warning/10" };
  return { label: "Fin de vie", color: "text-destructive", bg: "bg-destructive/10" };
}

export default function SystemInventoryCards({ sectionData }: Props) {
  const systems: SystemEntry[] = SYSTEM_DEFINITIONS.map((def) => ({
    ...def,
    value: (sectionData[`${def.key}_type`] as string) ?? (sectionData[def.key] as string) ?? null,
    year: (sectionData[`${def.key}_year`] as number) ?? null,
  }));

  const filled = systems.filter((s) => s.value || s.year).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-foreground">
          Inventaire des systèmes
        </h3>
        <Badge variant="outline" className="text-xs">
          {filled}/{systems.length} documentés
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {systems.map((sys) => {
          const Icon = sys.icon;
          const ageStatus = getAgeStatus(sys.year, sys.lifespan);
          const hasData = sys.value || sys.year;

          return (
            <Card key={sys.key} className="border-border/30">
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg shrink-0 ${hasData ? "bg-primary/10" : "bg-muted/50"}`}>
                  <Icon className={`w-4 h-4 ${hasData ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{sys.label}</p>
                  {hasData ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      {sys.value && (
                        <span className="text-xs text-muted-foreground truncate">{sys.value}</span>
                      )}
                      {sys.year && (
                        <span className="text-xs text-muted-foreground">({sys.year})</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                      <CircleDashed className="w-3 h-3" />
                      Information non disponible
                    </span>
                  )}
                </div>
                {ageStatus && (
                  <Badge variant="outline" className={`text-[10px] ${ageStatus.color} border-current shrink-0`}>
                    {ageStatus.label}
                  </Badge>
                )}
                {!hasData && (
                  <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                )}
                {hasData && !ageStatus && (
                  <CheckCircle className="w-3.5 h-3.5 text-success/50 shrink-0" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
