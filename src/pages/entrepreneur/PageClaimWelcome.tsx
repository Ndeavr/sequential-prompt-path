/**
 * UNPRO — /entrepreneur/bienvenue
 *
 * Statut réel relu du serveur. Un paramètre d'URL ou l'arrivée depuis
 * Stripe (success_url) ne prouve aucun paiement : seuls
 * contractor_plan_code() (paiement signé et valide) et
 * contractors.public_status (vérification) déterminent l'affichage.
 * Aucun score ni délai de rendez-vous inventé.
 */
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/ui/LanguageToggle";
import { activationStage, type ActivationStage } from "@/lib/contractor/claimEntry";
import { contractorLoginPath } from "@/lib/routing/contractorAuthHandoff";

const COPY: Record<"fr" | "en", Record<ActivationStage, { title: string; body: string }> & { refresh: string; dashboard: string; signIn: string; activate: string; profile: string }> = {
  fr: {
    signed_out: { title: "Connectez-vous", body: "Connectez-vous pour voir le statut réel de votre fiche." },
    no_profile: { title: "Aucune fiche rattachée", body: "Aucune fiche d'entreprise n'est encore rattachée à ce compte." },
    claimed_payment_unconfirmed: {
      title: "Paiement non confirmé pour l'instant",
      body: "Votre fiche est rattachée à votre compte. Aucun paiement confirmé n'est encore enregistré. Si vous venez de payer, la confirmation peut prendre quelques instants.",
    },
    paid_pending_verification: {
      title: "Paiement confirmé · vérification en cours",
      body: "Vos droits UNPRO sont actifs. Votre fiche sera publiée comme vérifiée après la vérification de votre entreprise et de vos licences.",
    },
    active_verified: { title: "Fiche active et vérifiée", body: "Vos droits UNPRO sont actifs et votre fiche est vérifiée." },
    refresh: "Actualiser le statut",
    dashboard: "Aller à mon tableau de bord",
    signIn: "Me connecter",
    activate: "Voir l'activation 350 $ + taxes",
    profile: "Compléter ma fiche",
  },
  en: {
    signed_out: { title: "Sign in", body: "Sign in to see the real status of your profile." },
    no_profile: { title: "No linked profile", body: "No business profile is linked to this account yet." },
    claimed_payment_unconfirmed: {
      title: "Payment not confirmed yet",
      body: "Your profile is linked to your account. No confirmed payment is recorded yet. If you just paid, confirmation can take a moment.",
    },
    paid_pending_verification: {
      title: "Payment confirmed · verification in progress",
      body: "Your UNPRO rights are active. Your profile will be published as verified once your business and licences are verified.",
    },
    active_verified: { title: "Profile active and verified", body: "Your UNPRO rights are active and your profile is verified." },
    refresh: "Refresh status",
    dashboard: "Go to my dashboard",
    signIn: "Sign in",
    activate: "See the $350 + taxes activation",
    profile: "Complete my profile",
  },
};

export default function PageClaimWelcome() {
  const { user, isLoading: authLoading } = useAuth();
  const { lang } = useLanguage();
  const c = COPY[lang === "en" ? "en" : "fr"];

  const { data, isLoading, isFetching, refetch, isError } = useQuery({
    queryKey: ["claim-welcome-status", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: contractor, error } = await supabase
        .from("contractors")
        .select("id, slug, business_name, public_status")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      const { data: plan, error: planError } = await supabase.rpc("contractor_plan_code", { _user_id: user!.id });
      if (planError) throw planError;
      return { contractor, planCode: (plan as string | null) ?? null };
    },
    retry: 1,
  });

  const stage = activationStage({
    signedIn: !!user,
    contractor: data?.contractor ?? null,
    planCode: data?.planCode ?? null,
  });
  const loading = authLoading || (!!user && isLoading);
  const copy = c[stage];

  return (
    <main className="alex-immersive min-h-[100svh] bg-background px-5 py-12 text-foreground">
      <Helmet>
        <title>Statut de ma fiche · UNPRO</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="mx-auto max-w-xl space-y-6">
        {loading ? (
          <div className="flex justify-center py-16" role="status" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : (
          <section className="space-y-4 rounded-2xl border border-border bg-card p-6" data-testid="claim-welcome-status" data-stage={stage}>
            {data?.contractor?.business_name && (
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{data.contractor.business_name}</p>
            )}
            <h1 className="text-2xl font-bold">{copy.title}</h1>
            <p className="text-muted-foreground">{copy.body}</p>
            {isError && (
              <p className="text-sm text-destructive" role="alert">
                {lang === "en" ? "Status could not be read. Try again." : "Le statut n'a pas pu être relu. Réessayez."}
              </p>
            )}
            <div className="grid gap-3 pt-2">
              {stage === "signed_out" ? (
                <Link to={contractorLoginPath("/entrepreneur/bienvenue")}>
                  <Button size="lg" className="w-full">{c.signIn}</Button>
                </Link>
              ) : stage === "no_profile" ? (
                <Link to="/contractor/join"><Button size="lg" className="w-full">{c.profile}</Button></Link>
              ) : stage === "claimed_payment_unconfirmed" ? (
                <>
                  <Button size="lg" variant="outline" className="w-full" onClick={() => refetch()} disabled={isFetching}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} aria-hidden /> {c.refresh}
                  </Button>
                  <Link to="/entrepreneurs/activation-350"><Button size="lg" className="w-full">{c.activate}</Button></Link>
                </>
              ) : (
                <Link to="/pro">
                  <Button size="lg" className="w-full">{c.dashboard} <ArrowRight className="ml-2 h-4 w-4" aria-hidden /></Button>
                </Link>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
