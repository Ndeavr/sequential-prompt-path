/** Existing demand landing: no unverified demand, eligibility or payment claims. */
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { demandLandingRequest, normalizeNoMatchService } from "@/lib/demand/noMatchPolicy";
import { buildActivation350Links } from "@/lib/activation350Links";
import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";

export default function PageContractorDemandLanding() {
  const { city = "", category = "" } = useParams();
  const [search] = useSearchParams();
  const links = buildActivation350Links(search);
  const scope = normalizeNoMatchService(category);
  const label = scope === "capage_colonnes_exterieures" ? "capage de colonnes extérieures" : category;
  const { isError, isLoading } = useQuery({
    queryKey: ["recruitment-landing", city, scope],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(demandLandingRequest(city, category), { method: "GET" });
      if (error || data?.ok !== true) throw new Error("segment_unavailable");
      return data;
    },
    enabled: Boolean(city && category),
    retry: false,
  });
  const opening = scope === "capage_colonnes_exterieures"
    ? "Bonjour! Exécutez-vous du capage de colonnes existantes en aluminium ou en tôle?"
    : `Bonjour! Acceptez-vous des projets de ${label} dans le secteur de ${city}?`;
  return (
    <main className="home-light min-h-screen bg-background text-foreground px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-4">
          <Badge variant="outline">{label} · {city}</Badge>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Développez votre activité dans ce secteur</h1>
          <p className="text-lg text-muted-foreground">Précisez vos spécialités, vos territoires et les projets recherchés avec Clara. Une possibilité de projet n’est pas un contrat acquis.</p>
          {isLoading && <p role="status" className="text-sm text-muted-foreground">Vérification du secteur…</p>}
          {isError && <p role="status" className="text-sm text-muted-foreground">La demande dans ce secteur n’est pas confirmée. Vous pouvez préciser vos services avec Clara.</p>}
        </header>
        <ClaraConversationBox forcedAudience="contractor" contractorOpening={opening} heading="Discutez avec Clara" />
        <section className="space-y-4 border-t border-border pt-6">
          <h2 className="text-2xl font-semibold">Activation UNPRO — 350 $ CAD + taxes applicables</h2>
          <p>Un paiement unique pour votre profil et 12 mois de présence IA sur UNPRO. Aucune garantie de visibilité sur une IA externe ni de rendez-vous.</p>
          <p className="text-sm text-muted-foreground">Aucun rendez-vous inclus par défaut. Tout droit particulier doit être vérifié et précisé avant paiement. Votre licence RBQ, lorsque requise, sa validité et votre assurance doivent être vérifiées avant toute recommandation.</p>
          <Button asChild size="lg" className="min-h-11 w-full sm:w-auto whitespace-normal h-auto py-3">
            <Link to={links.activate}>Activer mon profil — 350 $ + taxes <ArrowRight className="ml-2 h-4 w-4 shrink-0" /></Link>
          </Button>
          <Button asChild variant="link" className="whitespace-normal h-auto">
            <Link to={`${links.more}&ville=${encodeURIComponent(city)}&metier=${encodeURIComponent(label)}`}>Je veux d’autres clients selon mes critères</Link>
          </Button>
        </section>
      </div>
    </main>
  );
}
