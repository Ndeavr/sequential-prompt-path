/**
 * Offres UNPRO Gestionnaires — page dédiée, réutilise le catalogue Condos.
 * Aucun checkout non vérifié n'est déclenché par le calculateur.
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import ManagerPlans from "@/components/pricing/ManagerPlans";
import { useAuth } from "@/hooks/useAuth";

export default function ManagerPricingPage() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Forfaits pour gestionnaires d’immeubles et parcs immobiliers — UNPRO</title>
        <meta name="description" content="Gérez un immeuble locatif, plusieurs bâtiments ou une copropriété avec UNPRO. Forfaits annuels selon le total de portes, suivi et gestion de votre parc immobilier." />
        <link rel="canonical" href="https://unpro.ca/tarifs/gestionnaires" />
      </Helmet>
      <div className="mx-auto max-w-5xl px-4 pb-2 pt-7 sm:px-5">
        <Link to="/gestionnaires-immobiliers" className="inline-flex min-h-10 min-w-0 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour aux services pour gestionnaires
        </Link>
      </div>
      <ManagerPlans authenticated={Boolean(session)} />
    </div>
  );
}
