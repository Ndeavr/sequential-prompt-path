import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";

type Status = { status: "HEALTHY" | "WARNING" | "ERROR"; last_callback_at: string | null; last_test_success_at: string | null; delivery_rate_24h: number | null };

export default function SmsInfrastructureBanner() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("v_sms_infrastructure_status" as any).select("*").maybeSingle();
      if (data) setS(data as Status);
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  if (!s || s.status === "HEALTHY") return null;
  const isError = s.status === "ERROR";
  const Icon = isError ? XCircle : AlertTriangle;
  const tone = isError ? "bg-rose-500/15 border-rose-500/30 text-rose-200" : "bg-amber-500/15 border-amber-500/30 text-amber-200";
  const msg = isError
    ? "SMS Infrastructure ERROR — aucun callback Twilio reçu ou taux de livraison sous le seuil. Outbound bloqué."
    : "SMS Infrastructure WARNING — aucun test E2E validé dans les dernières 24 heures.";
  return (
    <Link to="/admin/sms-health" className={`block border rounded-xl px-4 py-3 mb-4 ${tone}`}>
      <div className="flex items-center gap-3 text-sm">
        <Icon className="w-4 h-4 flex-none" />
        <span className="font-medium flex-1">{msg}</span>
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
