import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function PageAippControlCenter() {
  const [contractorId, setContractorId] = useState("0abadcb7-3524-4db0-92ff-a73db8a443be");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("aipp-pipeline-run", {
        body: { contractor_id: contractorId, dry_run: false },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      setResult({ error: e.message });
    } finally { setRunning(false); }
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">AIPP Control Center</h1>
      <p className="text-white/60 mb-8">Pipeline AIPP MAX — crawl + AI summary + embeddings + score + geo pages</p>

      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-6">
        <label className="block text-sm text-white/70 mb-2">Contractor ID</label>
        <input value={contractorId} onChange={(e) => setContractorId(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-white text-sm font-mono" />
        <p className="text-xs text-white/40 mt-2">Défaut: Isolation Solution Royal (ISR)</p>

        <button onClick={run} disabled={running}
          className="mt-4 px-6 py-3 rounded-full bg-cyan-500 text-[#050816] font-semibold disabled:opacity-50 hover:bg-cyan-400 transition">
          {running ? "Pipeline en cours…" : "Lancer le pipeline complet"}
        </button>
      </div>

      {result && (
        <div className="mt-6 rounded-2xl bg-white/[0.03] border border-white/10 p-6">
          <h2 className="font-semibold mb-2">Résultat</h2>
          {result.error ? (
            <p className="text-red-400">{result.error}</p>
          ) : (
            <>
              <p className="text-white/80">Score total: <span className="text-cyan-300 text-xl font-bold">{result.total_score}</span></p>
              <p className="text-white/60 text-sm mt-1">Embeddings: {result.embeddings} · Geo pages: {result.geo_pages}</p>
              <a href={`/pro/${result.slug}`} target="_blank" rel="noreferrer" className="inline-block mt-3 text-cyan-300 underline">Voir le profil public →</a>
              <pre className="mt-4 text-xs bg-black/40 rounded-lg p-3 overflow-auto max-h-60 text-white/60">{JSON.stringify(result.scores, null, 2)}</pre>
              {result.logs && (
                <pre className="mt-2 text-[10px] bg-black/40 rounded-lg p-3 overflow-auto max-h-60 text-white/40">{result.logs.join("\n")}</pre>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
