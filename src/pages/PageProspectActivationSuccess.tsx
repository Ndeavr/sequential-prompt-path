/**
 * Checkout return URL is not an activation receipt.
 *
 * Do NOT invoke legacy activation-confirm from the browser: the currently
 * hosted Edge version may still mutate activated flags and issue magic links.
 * The signed webhook and server-side entitlement must be reconciled before
 * any UI claims a completed purchase.
 */
import { Link, useSearchParams } from "react-router-dom";

export default function PageActivationSuccess() {
  const [params] = useSearchParams();
  const hasSession = Boolean(params.get("session_id"));

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-2xl font-semibold">
          {hasSession ? "Vérification de votre activation" : "Lien de retour incomplet"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {hasSession
            ? "Votre retour de Stripe ne constitue pas une preuve de paiement ou d'activation. La confirmation exige un paiement réel réconcilié, un webhook Stripe signé, votre entreprise exacte et un droit de présence de 12 mois."
            : "Nous ne disposons pas des informations nécessaires pour retrouver cette tentative de paiement."}
        </p>
        <p className="text-sm text-muted-foreground">
          Si vous avez été débité, ne recommencez pas le paiement. Communiquez avec l'équipe UNPRO pour faire vérifier votre dossier.
        </p>
        <Link to="/" className="inline-flex items-center justify-center rounded-full border border-border px-6 py-3 text-sm font-medium">
          Retour à l'accueil
        </Link>
      </div>
    </main>
  );
}
