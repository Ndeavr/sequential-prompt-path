import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { PARTNER_ROLE_LABEL, type PartnerRole } from "@/lib/partnerTerms";

export default function PartnerEnAttente() {
  const { user, signOut } = useAuth();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user?.id) { setLoading(false); return; }
    const { data } = await supabase
      .from("partners" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setPartner(data); setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [user?.id]);

  if (loading) return <div className="min-h-screen bg-[#060B14] text-white/60 flex items-center justify-center">Chargement…</div>;

  const status = partner?.partner_application_status || "pending";
  const role = (partner?.partner_type || "ambassador") as PartnerRole;

  const StatusIcon = status === "approved" ? CheckCircle2 : status === "rejected" ? XCircle : status === "suspended" ? AlertCircle : Clock;
  const statusColor = status === "approved" ? "text-emerald-400" : status === "rejected" ? "text-red-400" : status === "suspended" ? "text-amber-400" : "text-amber-400";

  const statusLabel: Record<string, string> = {
    pending: "En attente d'analyse",
    under_review: "En cours d'analyse",
    approved: "Approuvée",
    rejected: "Refusée",
    suspended: "Suspendue",
  };

  return (
    <div className="min-h-screen bg-[#060B14] text-white flex items-center justify-center p-6">
      <div className="max-w-xl w-full space-y-6">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <StatusIcon className={`h-8 w-8 ${statusColor}`} />
            <div>
              <h1 className="text-2xl font-semibold">Demande {statusLabel[status]?.toLowerCase()}</h1>
              <p className="text-sm text-white/50">Rôle demandé : {PARTNER_ROLE_LABEL[role]}</p>
            </div>
          </div>

          <p className="text-white/70 leading-relaxed">
            Toute demande partenaire est analysée manuellement afin de protéger la qualité du réseau UNPRO.
            Vous recevrez un courriel dès qu'une décision sera prise.
          </p>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-white/40">Statut</div>
              <div className={`mt-0.5 font-medium ${statusColor}`}>{statusLabel[status]}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-white/40">Soumise le</div>
              <div className="mt-0.5 text-white/80">{partner?.application_submitted_at ? new Date(partner.application_submitted_at).toLocaleDateString("fr-CA") : "—"}</div>
            </div>
          </div>

          {partner?.admin_notes && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-200">
              <div className="font-medium mb-1">Note de l'administrateur</div>
              <div>{partner.admin_notes}</div>
            </div>
          )}

          <div className="border-t border-white/10 pt-4 space-y-2 text-xs text-white/60">
            <div className="font-medium text-white/80">Prochaines étapes</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Vérification de votre identité et de vos informations.</li>
              <li>Validation de votre rôle demandé et de l'acceptation des termes.</li>
              <li>Activation de votre compte et accès aux outils.</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <a href="mailto:partenaires@unpro.ca" className="text-xs px-3 py-2 rounded-lg border border-white/20 hover:bg-white/5">Contacter l'administration</a>
            <button onClick={signOut} className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/50 hover:bg-white/5">Se déconnecter</button>
          </div>
        </div>

        <div className="text-center text-xs text-white/30">
          <Link to="/" className="hover:text-white/60">Retour à l'accueil UNPRO</Link>
        </div>
      </div>
    </div>
  );
}
