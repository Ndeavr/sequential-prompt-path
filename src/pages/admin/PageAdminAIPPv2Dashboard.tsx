/**
 * Admin — AIPP v2 Dashboard
 * Shows recent audits and score distribution.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Globe } from "lucide-react";

interface AuditRow {
  id: string;
  domain: string;
  status: string;
  created_at: string;
  score_global?: number;
}

export default function PageAdminAIPPv2Dashboard() {
  const [audits, setAudits] = useState<AuditRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("aipp_audits")
        .select("id, domain, status, created_at, aipp_audit_scores(score_global)")
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setAudits(
          data.map((r: any) => ({
            id: r.id,
            domain: r.domain,
            status: r.status,
            created_at: r.created_at,
            score_global: r.aipp_audit_scores?.[0]?.score_global ?? undefined,
          }))
        );
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">AIPP v2 — Admin</h1>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="p-3">Domaine</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Statut</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <span className="text-foreground">{a.domain}</span>
                      </div>
                    </td>
                    <td className="p-3 font-semibold text-foreground">
                      {a.score_global !== undefined ? `${Number(a.score_global)}/100` : "—"}
                    </td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        a.status === "done" ? "bg-green-500/20 text-green-400" :
                        a.status === "processing" ? "bg-amber-500/20 text-amber-400" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(a.created_at).toLocaleDateString("fr-CA")}
                    </td>
                  </tr>
                ))}
                {audits.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Aucun audit</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
