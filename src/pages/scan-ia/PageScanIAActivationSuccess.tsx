/**
 * The Stripe Checkout return URL is not a receipt or an entitlement check.
 * Never call the legacy scan-ia-activation-confirm function from the browser:
 * a deployed older version can mark an arbitrary report activated without
 * matching a signed webhook, unique business and 12-month entitlement.
 * This screen is intentionally passive until the isolated E2E gate is proven.
 */
import { Link, useSearchParams } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function PageScanIAActivationSuccess() {
  const [params] = useSearchParams();
  const hasCompleteReference = Boolean(params.get("cs") && params.get("st"));

  return (
    <main className="alex-immersive flex min-h-screen items-center justify-center bg-[#050816] px-6 text-readable">
      <Helmet>
        <title>Vérification de l'activation — UNPRO</title>
      </Helmet>
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center backdrop-blur">
        <ShieldAlert className="mx-auto mb-6 h-12 w-12 text-amber-400" aria-hidden="true" />
        <h1 className="mb-3 text-2xl font-semibold text-white">
          {hasCompleteReference ? "Vérification de votre activation" : "Lien de retour incomplet"}
        </h1>
        <p className="mb-4 text-sm text-white/70">
          {hasCompleteReference
            ? "Le retour de Stripe ne confirme ni le paiement ni l'activation. UNPRO doit rapprocher le règlement, le webhook Stripe signé, votre entreprise et les droits de présence de 12 mois."
            : "Ce lien ne contient pas toutes les références nécessaires pour vérifier votre tentative de paiement. Aucune activation n'est confirmée."}
        </p>
        <p className="mb-6 text-sm text-white/70">
          Si vous avez été débité, ne payez pas de nouveau. Contactez l'équipe UNPRO pour faire vérifier votre dossier.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold text-white"
        >
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
