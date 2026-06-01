/**
 * PropertyHealthCard
 * Minimal premium card showing overall property health + 4 sub-scores.
 * Reads from public.property_health_scores. No new design tokens.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Activity, Droplets, Wind, ShieldCheck, Layers } from "lucide-react";

interface Props {
  propertyId: string;
}

type Row = {
  overall_score: number | null;
  moisture_score: number | null;
  ventilation_score: number | null;
  insulation_score: number | null;
  structural_score: number | null;
  generated_at: string;
};

function scoreColor(s: number | null): string {
  if (s === null) return "text-muted-foreground";
  if (s >= 80) return "text-emerald-500";
  if (s >= 60) return "text-amber-500";
  if (s >= 40) return "text-orange-500";
  return "text-destructive";
}

function SubScore({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Droplets;
  label: string;
  value: number | null;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon size={14} className="opacity-70" />
        <span>{label}</span>
      </div>
      <span className={`text-sm font-semibold tabular-nums ${scoreColor(value)}`}>
        {value ?? "—"}
      </span>
    </div>
  );
}

export function PropertyHealthCard({ propertyId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["property-health-score", propertyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_health_scores")
        .select(
          "overall_score, moisture_score, ventilation_score, insulation_score, structural_score, generated_at",
        )
        .eq("property_id", propertyId)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as Row | null;
    },
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-primary" />
        <h3 className="text-sm font-semibold">Santé de la propriété</h3>
      </div>

      <div className="flex items-baseline gap-2">
        <span className={`text-4xl font-semibold tabular-nums ${scoreColor(data?.overall_score ?? null)}`}>
          {isLoading ? "…" : data?.overall_score ?? "—"}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>

      <div className="divide-y divide-border/40">
        <SubScore icon={Droplets} label="Humidité" value={data?.moisture_score ?? null} />
        <SubScore icon={Wind} label="Ventilation" value={data?.ventilation_score ?? null} />
        <SubScore icon={Layers} label="Isolation" value={data?.insulation_score ?? null} />
        <SubScore icon={ShieldCheck} label="Structure" value={data?.structural_score ?? null} />
      </div>

      {!data && !isLoading && (
        <p className="text-[11px] text-muted-foreground italic">
          Les analyses à venir vont alimenter le score automatiquement.
        </p>
      )}
    </Card>
  );
}

export default PropertyHealthCard;
