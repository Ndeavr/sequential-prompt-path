import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function PageAippDebug() {
  const [audits, setAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("contractor_aipp_audits")
      .select("*, contractors(business_name)")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setAudits(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8 text-muted-foreground animate-pulse">Chargement…</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold">AIPP Debug — Audits récents</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-3">Entreprise</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Confiance</th>
              <th className="py-2 pr-3">Score</th>
              <th className="py-2 pr-3">Sources</th>
              <th className="py-2 pr-3">Signaux</th>
              <th className="py-2 pr-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id} className="border-b border-border/30">
                <td className="py-2 pr-3 font-medium">{(a.contractors as any)?.business_name || "—"}</td>
                <td className="py-2 pr-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    a.analysis_status === "complete" ? "bg-success/10 text-success" :
                    a.analysis_status === "running" ? "bg-primary/10 text-primary" :
                    a.analysis_status === "partial" ? "bg-accent/10 text-accent" :
                    "bg-muted text-muted-foreground"
                  }`}>{a.analysis_status}</span>
                </td>
                <td className="py-2 pr-3">{a.confidence_level}</td>
                <td className="py-2 pr-3 font-bold">{a.overall_score ?? "—"}</td>
                <td className="py-2 pr-3">{a.validated_sources_count}</td>
                <td className="py-2 pr-3">{a.validated_signals_count}/{a.total_possible_signals_count}</td>
                <td className="py-2 pr-3 text-muted-foreground">{new Date(a.created_at).toLocaleString("fr-CA")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
