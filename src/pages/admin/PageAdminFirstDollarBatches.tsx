/**
 * /admin/first-dollar/batches — Controlled SMS batch sender.
 * Default 25 SMS. Mandatory review before next batch.
 */
import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Send, Lock } from "lucide-react";
import { useSmsBatches, useSendBatch, useReviewBatch } from "@/hooks/useSmsBatches";
import SmsHealthPanel from "@/components/admin/SmsHealthPanel";
import { useSmsHealth } from "@/hooks/useSmsHealth";

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  pending:  { label: "En attente",  cls: "bg-slate-500/20 text-slate-300" },
  sending:  { label: "Envoi…",       cls: "bg-sky-500/20 text-sky-300" },
  sent:     { label: "Envoyé",       cls: "bg-amber-500/20 text-amber-300" },
  reviewed: { label: "Approuvé",     cls: "bg-emerald-500/20 text-emerald-300" },
};

export default function PageAdminFirstDollarBatches() {
  const [size, setSize] = useState(25);
  const [notes, setNotes] = useState("");
  const { data: batches } = useSmsBatches(30);
  const sendBatch = useSendBatch();
  const reviewBatch = useReviewBatch();
  const { data: health } = useSmsHealth();
  const outboundBlocked = !!health && !health.health.is_operational;

  const pendingReview = batches?.find(b => b.status !== "reviewed" && b.status === "sent");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 px-4 sm:px-6 py-8">
      <Helmet><title>Batch Sender — First Dollar</title></Helmet>

      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Batch Sender</h1>
            <p className="text-sm text-slate-400 mt-1">
              25 SMS par lot · templates A/B/C round-robin · pause obligatoire
            </p>
          </div>
          <Link to="/admin/first-dollar" className="text-sm text-slate-400 hover:text-white">← Funnel</Link>
        </header>

        {/* SMS infrastructure health */}
        <SmsHealthPanel />

        {/* Send panel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-center gap-3 mb-4">
            <Send className="h-5 w-5 text-sky-400" />
            <h2 className="text-lg font-semibold">Envoyer un batch</h2>
          </div>

          {pendingReview && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-500/10 p-3 mb-4 flex items-center gap-2 text-sm text-amber-200">
              <Lock className="h-4 w-4" />
              Batch précédent en attente de revue. Approuvez-le ci-dessous avant d'en envoyer un nouveau.
            </div>
          )}

          {outboundBlocked && (
            <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 mb-4 flex items-start gap-2 text-sm text-rose-200">
              <Lock className="h-4 w-4 mt-0.5" />
              <div>
                <b>Outbound bloqué.</b> {health?.blockReason ?? "Santé SMS insuffisante."} Utilisez « Exécuter un test SMS » ci-dessus pour débloquer.
              </div>
            </div>
          )}

          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Taille du batch</label>
              <input
                type="number"
                min={1}
                max={100}
                value={size}
                onChange={e => setSize(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-24 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm"
              />
            </div>
            <button
              disabled={sendBatch.isPending || !!pendingReview || outboundBlocked}
              onClick={() => sendBatch.mutate({ size })}
              className="px-6 py-2.5 rounded-lg bg-white text-slate-950 font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
            >
              {sendBatch.isPending ? "Envoi…" : `Envoyer ${size} SMS`}
            </button>
            {(pendingReview || outboundBlocked) && (
              <button
                onClick={() => sendBatch.mutate({ size, force: true })}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                Forcer (skip check)
              </button>
            )}
          </div>
        </div>


        {/* Batch list */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 text-sm font-semibold">
            Historique des batchs
          </div>
          <div className="divide-y divide-white/5">
            {(batches ?? []).map(b => {
              const status = STATUS_LABEL[b.status] ?? STATUS_LABEL.pending;
              return (
                <div key={b.id} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider ${status.cls}`}>
                          {status.label}
                        </span>
                        <span className="text-sm font-semibold">{b.size} SMS</span>
                        <span className="text-xs text-slate-500">
                          {new Date(b.created_at).toLocaleString("fr-CA")}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-2 flex gap-3 flex-wrap">
                        <span>Envoyés: <b className="text-slate-200">{b.sent_count}</b></span>
                        <span>Livrés: <b className="text-slate-200">{b.delivered_count}</b></span>
                        <span>Cliqués: <b className="text-slate-200">{b.clicked_count}</b></span>
                        <span>Convertis: <b className="text-emerald-300">{b.converted_count}</b></span>
                        {Object.entries(b.template_distribution ?? {}).map(([code, n]) => (
                          <span key={code}>Template {code}: <b>{n as number}</b></span>
                        ))}
                      </div>
                    </div>

                    {b.status === "sent" && !b.reviewed_at && (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Notes de revue (optionnel)"
                          value={notes}
                          onChange={e => setNotes(e.target.value)}
                          className="text-xs rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 w-56"
                        />
                        <button
                          onClick={() => { reviewBatch.mutate({ id: b.id, notes }); setNotes(""); }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-400"
                        >
                          <CheckCircle2 className="inline h-3 w-3 mr-1" /> Approuver
                        </button>
                      </div>
                    )}
                    {b.reviewed_at && (
                      <div className="text-xs text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Approuvé {new Date(b.reviewed_at).toLocaleString("fr-CA")}
                      </div>
                    )}
                    {b.status === "sending" && (
                      <div className="text-xs text-sky-300 flex items-center gap-1">
                        <Clock className="h-3 w-3 animate-pulse" /> En cours…
                      </div>
                    )}
                  </div>
                  {b.notes && (
                    <div className="text-xs text-slate-400 mt-2 italic">« {b.notes} »</div>
                  )}
                </div>
              );
            })}
            {(!batches || batches.length === 0) && (
              <div className="p-6 text-center text-sm text-slate-500">
                Aucun batch envoyé. Cliquez sur "Envoyer 25 SMS" pour démarrer.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-400">
          <div className="font-semibold text-white mb-2">Règle</div>
          Chaque batch envoie {size} SMS, alterne les templates A/B/C, puis <b>pause obligatoire</b> jusqu'à approbation.
          Objectif : vérifier taux de clic et retours avant d'envoyer le prochain lot.
        </div>
      </div>
    </div>
  );
}
