import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Calendar, TrendingUp } from "lucide-react";

export default function PageActivationSuccess() {
  const [sp] = useSearchParams();
  const cid = sp.get("cid");
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (!cid) return;
    (async () => {
      const { data: c } = await supabase.from("acq_contractors").select("*").eq("id", cid).maybeSingle();
      const { data: sub } = await supabase.from("acq_subscriptions")
        .select("*").eq("contractor_id", cid).order("created_at", { ascending: false }).limit(1).maybeSingle();
      setData({ contractor: c, subscription: sub });
    })();
  }, [cid]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center px-4 py-12">
      <Card className="max-w-xl w-full border-2 border-primary/20">
        <CardContent className="p-8 space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-2">Votre profil est actif.</h1>
            <p className="text-muted-foreground">
              Votre positionnement UNPRO est en cours. Nous commençons à vous envoyer des opportunités.
            </p>
          </div>

          {data?.contractor && (
            <div className="bg-muted/40 rounded-lg p-4 text-left space-y-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Entreprise activée</div>
              <div className="font-semibold">{data.contractor.company_name}</div>
              {data.subscription?.trial_ends_at && (
                <div className="text-xs text-muted-foreground">
                  Période d'essai jusqu'au {new Date(data.subscription.trial_ends_at).toLocaleDateString("fr-CA")}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 text-sm text-left">
            <div className="flex gap-3 items-start">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Prochaine étape</div>
                <div className="text-muted-foreground">Optimisation de votre visibilité dans votre secteur.</div>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <Calendar className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Vos rendez-vous</div>
                <div className="text-muted-foreground">Vous serez notifié dès qu'un client vous est attribué.</div>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <TrendingUp className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold">Conversion en abonnement</div>
                <div className="text-muted-foreground">À la fin de votre essai, votre abonnement mensuel s'activera automatiquement.</div>
              </div>
            </div>
          </div>

          {data?.contractor?.slug && (
            <Link to={`/aipp/${data.contractor.slug}`}>
              <Button size="lg" className="w-full">Voir mon profil AIPP</Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
