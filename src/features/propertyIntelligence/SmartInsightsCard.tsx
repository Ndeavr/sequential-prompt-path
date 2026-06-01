/**
 * SmartInsightsCard
 * Surfaces lightweight AI-derived insights for a property by combining
 * recent visual analyses + memory events + recommendations.
 * Read-only, additive — uses existing tokens.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

interface Props {
  propertyId: string;
}

interface Insight {
  text: string;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
}

function dotClass(sev: Insight["severity"]) {
  return sev === "critical"
    ? "bg-destructive"
    : sev === "high"
    ? "bg-orange-500"
    : sev === "medium"
    ? "bg-amber-400"
    : "bg-primary";
}

export function SmartInsightsCard({ propertyId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["smart-insights", propertyId],
    queryFn: async (): Promise<Insight[]> => {
      const [mem, vis] = await Promise.all([
        supabase
          .from("property_memory_events")
          .select("event_type, ai_summary, risk_level, created_at")
          .eq("property_id", propertyId)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("visual_analyses")
          .select("ai_findings, urgency_level, recommended_action, created_at")
          .eq("property_id", propertyId)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const out: Insight[] = [];

      (mem.data ?? []).forEach((m: any) => {
        if (m.ai_summary) {
          out.push({
            text: m.ai_summary,
            severity: (m.risk_level as Insight["severity"]) ?? "low",
            source: m.event_type,
          });
        }
      });

      (vis.data ?? []).forEach((v: any) => {
        if (v.recommended_action) {
          out.push({
            text: v.recommended_action,
            severity: (v.urgency_level as Insight["severity"]) ?? "medium",
            source: "visual_analysis",
          });
        }
        if (Array.isArray(v.ai_findings)) {
          v.ai_findings.slice(0, 2).forEach((f: any) => {
            if (f?.label) {
              out.push({
                text: String(f.label),
                severity: (f.severity as Insight["severity"]) ?? "medium",
                source: "visual_analysis",
              });
            }
          });
        }
      });

      // Deduplicate by text
      const seen = new Set<string>();
      return out.filter((i) => {
        const k = i.text.trim().toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).slice(0, 6);
    },
  });

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-primary" />
        <h3 className="text-sm font-semibold">Intelligences récentes</h3>
      </div>

      {isLoading && (
        <p className="text-xs text-muted-foreground">Analyse en cours…</p>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <p className="text-xs text-muted-foreground italic">
          Téléversez une photo ou une soumission pour générer des insights.
        </p>
      )}

      {data && data.length > 0 && (
        <ul className="space-y-2">
          {data.map((i, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotClass(i.severity)}`} />
              <span className="text-xs text-foreground/85 leading-snug">{i.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default SmartInsightsCard;
