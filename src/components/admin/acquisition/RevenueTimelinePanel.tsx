/**
 * RevenueTimelinePanel — operator-only lookup of the canonical revenue
 * timeline for a single contractor prospect. Reads /contractor-revenue-timeline.
 * Mobile-first: stacked cards. No writes, no provider calls.
 */
import { useState } from "react";
import { Loader2, Search, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type StageStatus = "success" | "pending" | "failed" | "blocked" | "skipped" | "unknown";
type Stage = {
  key: string;
  label: string;
  status: StageStatus;
  timestamp?: string | null;
  reason_code?: string | null;
  explanation_fr: string;
  source: string;
  provider_id?: string | null;
  next_action?: string | null;
  retryable?: boolean;
};
type Response = {
  ok: boolean;
  error?: string;
  subject?: {
    business_name: string;
    city: string | null;
    category: string | null;
    phone_display: string | null;
    website_url: string | null;
    verified_prospect_id: string | null;
    contractor_lead_id: string | null;
  };
  stages?: Stage[];
  external_blockers?: Array<Record<string, unknown>>;
  next_action?: string;
  conversion_next_action?: string | null;
  technical_next_action?: string | null;
};

const STATUS_STYLE: Record<StageStatus, string> = {
  success: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200",
  pending: "bg-amber-500/10 border-amber-400/30 text-amber-200",
  failed: "bg-rose-500/15 border-rose-400/40 text-rose-200",
  blocked: "bg-rose-500/10 border-rose-400/30 text-rose-200",
  skipped: "bg-white/[0.04] border-white/10 text-white/60",
  unknown: "bg-white/[0.03] border-white/10 text-white/50",
};
const STATUS_DOT: Record<StageStatus, string> = {
  success: "bg-emerald-400",
  pending: "bg-amber-400",
  failed: "bg-rose-400",
  blocked: "bg-rose-400",
  skipped: "bg-white/30",
  unknown: "bg-white/20",
};

export function RevenueTimelinePanel({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<Response | null>(null);

  const run = async (q: string) => {
    if (!q.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("contractor-revenue-timeline", {
        body: { query: q.trim() },
      });
      if (error) throw error;
      setResp(data as Response);
    } catch (e: any) {
      setResp({ ok: false, error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 className="text-xs uppercase tracking-wide text-white/40 mb-2">
        Timeline revenu (par prospect)
      </h2>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
        <form
          onSubmit={(e) => { e.preventDefault(); run(query); }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom d'entreprise ou téléphone (ex. Electro Pompe)"
            className="flex-1 rounded-xl bg-white/[0.06] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-2 text-sm flex items-center justify-center gap-2 hover:bg-white/[0.1] disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Analyser
          </button>
          <button
            type="button"
            onClick={() => { setQuery("Electro Pompe"); run("Electro Pompe"); }}
            disabled={busy}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm hover:bg-cyan-500/20 disabled:opacity-50"
          >
            Electro Pompe
          </button>
        </form>

        {resp && !resp.ok && (
          <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {resp.error === "not_found" ? "Aucun prospect trouvé." : `Erreur : ${resp.error}`}
          </div>
        )}

        {resp?.ok && resp.subject && (
          <>
            {/* Subject header */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-sm">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-base font-semibold text-white">{resp.subject.business_name}</span>
                {resp.subject.city && <span className="text-white/60 text-xs">{resp.subject.city}</span>}
                {resp.subject.category && <span className="text-white/50 text-xs">· {resp.subject.category}</span>}
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/50">
                {resp.subject.phone_display && <span>📞 {resp.subject.phone_display}</span>}
                {resp.subject.website_url && (
                  <a href={resp.subject.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-white/80">
                    <ExternalLink className="w-3 h-3" /> site
                  </a>
                )}
                {resp.subject.verified_prospect_id && (
                  <span className="font-mono">vp:{resp.subject.verified_prospect_id.slice(0, 8)}</span>
                )}
                {resp.subject.contractor_lead_id && (
                  <span className="font-mono">lead:{resp.subject.contractor_lead_id.slice(0, 8)}</span>
                )}
              </div>
            </div>

            {/* External blockers */}
            {resp.external_blockers && resp.external_blockers.length > 0 && (
              <div className="space-y-2">
                {resp.external_blockers.map((b: any, i) => (
                  <div key={i} className="rounded-xl border border-rose-400/40 bg-rose-500/10 p-3 text-xs text-rose-100">
                    <div className="font-semibold text-rose-200">
                      Blocueur externe · {b.provider} · {b.code}
                    </div>
                    <div className="mt-1">{b.message}</div>
                    <div className="mt-1 text-rose-200/80">
                      Action : {b.account_setting} · Étape : {b.affected_stage}
                      {b.fallback_available ? " · Fallback email disponible" : ""}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Next action */}
            {resp.next_action && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                Prochaine action : {resp.next_action}
              </div>
            )}

            {/* Stage cards (stacked, mobile-first) */}
            <ol className="space-y-2">
              {resp.stages!.map((s, idx) => (
                <li
                  key={s.key}
                  className={`rounded-xl border p-3 text-xs ${STATUS_STYLE[s.status]}`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[s.status]}`} />
                    <span className="font-semibold uppercase tracking-wide text-[11px]">
                      {idx + 1}. {s.label}
                    </span>
                    <span className="ml-auto text-[10px] opacity-70">{s.status}</span>
                  </div>
                  <div className="mt-1 opacity-90">{s.explanation_fr}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] opacity-70">
                    {s.timestamp && <span>{new Date(s.timestamp).toLocaleString("fr-CA")}</span>}
                    {s.provider_id && <span className="font-mono">{s.provider_id}</span>}
                    {s.reason_code && <span>code: {s.reason_code}</span>}
                    <span className="opacity-60">src: {s.source}</span>
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    </section>
  );
}
