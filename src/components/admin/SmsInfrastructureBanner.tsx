import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

type Status = { status: "HEALTHY" | "WARNING" | "ERROR"; last_callback_at: string | null; last_test_success_at: string | null; delivery_rate_24h: number | null };

type LastRun = { created_at: string; success: boolean | null; callback_received: boolean | null; error: string | null } | null;
type Loaded = { view: Status | null; last: LastRun; error: string | null };

const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("fr-CA") : "—");

/** Pure: derive banner state from view + latest E2E run. Never claims a provider outage. */
export function smsBannerState(l: Loaded): { tone: "error" | "warning" | "unknown" | null; msg: string } {
  if (l.error || !l.view) return { tone: "unknown", msg: `Santé SMS inconnue — données indisponibles${l.error ? ` (${l.error})` : ""}.` };
  const v = l.view;
  if (v.status === "HEALTHY") return { tone: null, msg: "" };
  if (!v.last_callback_at) return { tone: "error", msg: "SMS — aucun callback de statut reçu à ce jour. Cause non établie (pas une panne fournisseur prouvée)." };
  if (v.status === "ERROR") return { tone: "error", msg: `SMS — taux de livraison 24 h sous le seuil (${v.delivery_rate_24h ?? "?"} %). Dernier callback ${fmt(v.last_callback_at)}.` };
  if (l.last && l.last.success === false) return { tone: "warning", msg: `SMS — dernier test E2E échoué le ${fmt(l.last.created_at)}${l.last.error ? ` : ${l.last.error.slice(0, 80)}` : ""}. Dernier succès : ${fmt(v.last_test_success_at)}.` };
  if (!v.last_test_success_at) return { tone: "warning", msg: "SMS — aucun test E2E réussi enregistré. Test absent, pas une panne prouvée." };
  return { tone: "warning", msg: `SMS — test E2E périmé : dernier succès le ${fmt(v.last_test_success_at)} (plus de 24 h). Dernier callback ${fmt(v.last_callback_at)}.` };
}

export default function SmsInfrastructureBanner() {
  const [l, setL] = useState<Loaded | null>(null);
  useEffect(() => {
    const load = async () => {
      const sb = supabase as any;
      const [v, r] = await Promise.all([
        sb.from("v_sms_infrastructure_status").select("*").maybeSingle(),
        sb.from("sms_test_runs").select("created_at, success, callback_received, error").order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setL({ view: (v.data as Status) ?? null, last: (r.data as LastRun) ?? null, error: v.error?.message ?? null });
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  if (!l) return null;
  const st = smsBannerState(l);
  if (!st.tone) return null;
  const Icon = st.tone === "error" ? XCircle : AlertTriangle;
  const tone = st.tone === "error" ? "bg-rose-500/15 border-rose-500/30 text-rose-200" : "bg-amber-500/15 border-amber-500/30 text-amber-200";
  return (
    <Link to="/admin/sms-health" className={`block border rounded-xl px-4 py-3 mb-4 ${tone}`}>
      <div className="flex items-center gap-3 text-sm">
        <Icon className="w-4 h-4 flex-none" />
        <span className="font-medium flex-1">{st.msg} Les envois réels restent soumis au gate.</span>
        <span className="text-xs opacity-80">Voir SMS Health →</span>
      </div>
    </Link>
  );
}

export function SmsProductionReadyBadge({ score, status, lastTest }: { score: number; status: string; lastTest: string | null }) {
  const ok = status === "HEALTHY" && score >= 90 && !!lastTest;
  if (ok) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-xs font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" />
        SMS Infrastructure Production Ready · validé {lastTest ? new Date(lastTest).toLocaleString("fr-CA") : ""}
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs font-medium">
      <AlertTriangle className="w-3.5 h-3.5" />
      Non validé · score {score}/100 · {status}
    </div>
  );
}
