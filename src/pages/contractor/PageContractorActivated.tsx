/**
 * /contractor/activated — passive, fail-closed Stripe return page.
 * Never invoke activation-confirm from a browser: a hosted older version may
 * still grant unverified campaign flags or expose an authentication magic link.
 * The signed webhook and entitlement ledger alone determine actual activation.
 */
import { useSearchParams, Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export default function PageContractorActivated() {
  const [params] = useSearchParams();
  const hasSession = Boolean(params.get("session") || params.get("session_id"));

  return (
    <main className="min-h-screen bg-[#060B14] text-white flex items-center justify-center px-5">
      <div className="w-full max-w-md text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-full bg-amber-400/15 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {hasSession ? "Vérification de votre activation" : "Lien de retour incomplet"}
        </h1>
        <p className="text-sm text-white/70">
          {hasSession
            ? "Le retour du paiement ne confirme pas encore l'activation du profil. Nous devons vérifier le paiement Stripe réel, le webhook signé, votre entreprise et le droit de présence de 12 mois."
            : "La référence de votre tentative de paiement est manquante."}
        </p>
        <p className="text-sm text-white/60">
          Si vous avez été débité, ne payez pas de nouveau. Communiquez avec UNPRO pour faire vérifier votre dossier.
        </p>
        <Link to="/" className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-5 py-3 text-sm font-semibold text-white">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
