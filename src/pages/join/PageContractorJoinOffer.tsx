import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle, MapPin, Star, Shield, Clock, ArrowRight } from "lucide-react";

export default function PageContractorJoinOffer() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data, error: err } = await supabase
        .from("contractor_recruitment_offers")
        .select("*, contractor_prospects(business_name, city, category_slug, owner_name, review_count, review_rating), recruitment_clusters(name, region_name)")
        .eq("magic_token", token)
        .maybeSingle();
      if (err || !data) setError("Offre introuvable ou expirée");
      else setOffer(data);
      setLoading(false);
    })();
  }, [token]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Skeleton className="h-96 w-full max-w-lg rounded-2xl" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <p className="text-lg font-semibold mb-2">Offre introuvable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    </div>
  );

  const prospect = offer.contractor_prospects;
  const cluster = offer.recruitment_clusters;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-gradient-to-b from-primary/10 to-background px-4 pt-12 pb-8">
        <div className="max-w-lg mx-auto text-center space-y-3">
          <Badge className="bg-primary/20 text-primary border-0">Offre exclusive</Badge>
          <h1 className="text-2xl md:text-3xl font-bold">
            {prospect?.owner_name || "Entrepreneur"}, votre place est réservée
          </h1>
          <p className="text-muted-foreground text-sm">
            UNPRO recrute les meilleurs entrepreneurs en <strong className="capitalize">{prospect?.category_slug}</strong> dans la région de <strong>{cluster?.name}</strong>
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-6 pb-12">
        {/* Business info */}
        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{prospect?.business_name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {prospect?.city}
                </p>
              </div>
              {prospect?.review_rating && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                  {prospect.review_rating} ({prospect.review_count})
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scarcity */}
        {offer.scarcity_message && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-300">{offer.scarcity_message}</p>
          </div>
        )}

        {/* Value prop */}
        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">Ce que vous obtenez avec UNPRO</h3>
            {[
              "Rendez-vous qualifiés dans votre territoire",
              "Matching intelligent avec les bons propriétaires",
              "Profil vérifié et mis en valeur",
              "Score AIPP et visibilité premium",
              "Zéro compétition de soumissions",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Offer details */}
        <Card className="bg-card/80 backdrop-blur border-primary/30 border-2">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Plan recommandé</p>
                <p className="text-lg font-bold capitalize">{offer.plan_code || "Pro"}</p>
              </div>
              <div className="text-right">
                {offer.founder_discount_percent > 0 && (
                  <Badge className="bg-green-500 mb-1">-{offer.founder_discount_percent}% fondateur</Badge>
                )}
                <p className="text-2xl font-bold">${((offer.recurring_amount || offer.price_amount || 0) / 100).toFixed(0)}<span className="text-sm text-muted-foreground">/mois</span></p>
              </div>
            </div>
            {offer.setup_fee_amount > 0 && (
              <p className="text-xs text-muted-foreground">+ Frais d'activation: ${(offer.setup_fee_amount / 100).toFixed(0)}</p>
            )}
          </CardContent>
        </Card>

        {/* CTA */}
        <Button size="lg" className="w-full" onClick={() => navigate(`/join/${token}/checkout`)}>
          Activer mes rendez-vous <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" /> Paiement sécurisé • Annulation flexible
        </p>
      </div>
    </div>
  );
}
