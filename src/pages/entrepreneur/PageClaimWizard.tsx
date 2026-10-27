/**
 * UNPRO — legacy profile-claim route, now an identity-first handoff.
 *
 * The old 4-step wizard used invented financial/appointment projections and
 * an independent untaxed checkout. Keep existing links functional, but send
 * visitors to the canonical self-service identification route instead.
 */
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

function suggestedName(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function PageClaimWizard() {
  const { slug = "" } = useParams<{ slug: string }>();

  return (
    <main className="min-h-[100svh] bg-[#050816] px-5 py-10 text-white">
      <Helmet>
        <title>Réclamer un profil d'entreprise · UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="mx-auto max-w-xl space-y-7">
        <Link
          to={"/entrepreneur/" + encodeURIComponent(slug)}
          className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Retour au profil
        </Link>

        <header className="space-y-3">
          <h1 className="text-3xl font-bold leading-tight">
            Réclamer le profil de votre entreprise
          </h1>
          <p className="text-white/75">
            Identifiez votre entreprise pour accéder à son analyse. Un lien
            public ne prouve ni la propriété de l'entreprise ni la validité
            d'une licence professionnelle.
          </p>
        </header>

        {slug && (
          <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wider text-white/60">
              Profil consulté — nom indicatif non vérifié
            </p>
            <p className="mt-2 text-xl font-semibold">{suggestedName(slug)}</p>
          </section>
        )}

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 shrink-0 text-cyan-300" />
            <p className="text-sm text-white/80">
              Saisissez le site Web, le NEQ ou le numéro RBQ de votre entreprise
              dans le parcours d'inscription existant. L'activation et les
              droits sont confirmés seulement après vérification du paiement.
            </p>
          </div>

          <Link to="/contractor/join" className="block">
            <Button
              size="lg"
              className="w-full bg-amber-400 text-black hover:bg-amber-300"
            >
              Identifier mon entreprise
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>

          <p className="text-xs text-white/60">
            Offre de base : 350 $ CA + taxes applicables, paiement unique,
            profil UNPRO et 12 mois de présence. Aucun rendez-vous inclus
            sans droit contractuel distinct. Aucun paiement sur cette page.
          </p>
        </section>
      </div>
    </main>
  );
}
