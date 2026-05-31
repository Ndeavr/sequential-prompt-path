/**
 * UNPRO Admin — AI Trust Dashboard
 * Overview of trust positions, semantic gaps and territory occupancy.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import TrustPositionBadge from "@/features/aiTrust/components/TrustPositionBadge";
import ConfidenceBar from "@/features/aiTrust/components/ConfidenceBar";

export default function PageAdminAiTrustDashboard() {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "ai-trust", "contractors_trust"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contractors_trust" as any)
        .select("*")
        .order("trust_score", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  return (
    <div className="intel-theme min-h-screen bg-[#050816] text-foreground">
      <header className="border-b border-white/5 px-6 py-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">
          UNPRO Admin · AI Trust
        </p>
        <h1 className="text-2xl font-semibold mt-1">Trust Position Dashboard</h1>
      </header>

      <main className="p-6 grid gap-4">
        {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-muted-foreground">
            Aucun signal de confiance encore calculé. Lancez un audit pour alimenter le graphe.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rows.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 glass-intel"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Contractor
                  </p>
                  <h3 className="text-lg font-medium">{r.contractor_id?.slice(0, 8)}…</h3>
                </div>
                <TrustPositionBadge position={r.trust_position ?? "emerging"} />
              </div>
              <ConfidenceBar value={(r.trust_score ?? 0) / 100} label="Trust score" />
              <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
                <div>
                  <p className="text-muted-foreground">AI conf.</p>
                  <p className="font-mono">{((r.ai_confidence ?? 0) * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sem. gap</p>
                  <p className="font-mono">
                    {((r.semantic_gap_score ?? 0) * 100).toFixed(0)}%
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sentiment</p>
                  <p className="font-mono capitalize">{r.review_sentiment ?? "—"}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
