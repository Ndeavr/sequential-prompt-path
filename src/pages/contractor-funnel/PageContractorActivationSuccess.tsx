/**
 * UNPRO — PageContractorActivationSuccess
 * État réel d'activation après paiement (source : base de données).
 * Aucune donnée simulée : chaque ligne reflète un fait vérifié côté serveur.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Eye,
  LayoutDashboard,
  Star,
  Clock,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { fadeUp, staggerContainer, scaleIn } from "@/lib/motion";
import { supabase } from "@/integrations/supabase/client";
import ActivationConfetti from "@/components/unpro/ActivationConfetti";

type ActivationState = {
  loading: boolean;
  businessName: string | null;
  planCode: string | null;
  paid: boolean;
  amountCents: number;
  currency: string;
  subscriptionActive: boolean;
  published: boolean;
  creditCents: number;
};

const INITIAL: ActivationState = {
  loading: true,
  businessName: null,
  planCode: null,
  paid: false,
  amountCents: 0,
  currency: "CAD",
  subscriptionActive: false,
  published: false,
  creditCents: 0,
};

const formatMoney = (cents: number, currency: string) =>
  new Intl.NumberFormat("fr-CA", { style: "currency", currency: currency || "CAD" }).format(
    cents / 100,
  );

export default function PageContractorActivationSuccess() {
  const { state: funnelState } = useContractorFunnel();
  const navigate = useNavigate();
  const [state, setState] = useState<ActivationState>(INITIAL);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
        return;
      }

      const { data: contractor } = await supabase
        .from("contractors")
        .select("id, business_name, is_published, activation_status, account_status")
        .eq("user_id", userId)
        .maybeSingle();

      if (!contractor) {
        if (!cancelled) setState((s) => ({ ...s, loading: false }));
        return;
      }

      const [{ data: sub }, { data: wallet }] = await Promise.all([
        supabase
          .from("contractor_subscriptions")
          .select("plan_id, status, payment_status, amount_paid_cents, currency, updated_at")
          .eq("contractor_id", contractor.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("contractor_wallet")
          .select("balance_cents")
          .eq("contractor_id", contractor.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;

      setState({
        loading: false,
        businessName: (contractor as any).business_name ?? null,
        planCode: (sub as any)?.plan_id ?? null,
        paid: (sub as any)?.payment_status === "paid",
        amountCents: Number((sub as any)?.amount_paid_cents ?? 0),
        currency: String((sub as any)?.currency ?? "CAD"),
        subscriptionActive: ["active", "trialing"].includes(String((sub as any)?.status ?? "")),
        published: Boolean((contractor as any).is_published),
        creditCents: Number((wallet as any)?.balance_cents ?? 0),
      });
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const businessName = state.businessName || funnelState.businessName || "Votre entreprise";
  const activated = state.paid || state.subscriptionActive || state.creditCents > 0;

  const checklist = [
    {
      key: "payment",
      label: state.paid
        ? `Paiement confirmé — ${formatMoney(state.amountCents, state.currency)}`
        : state.creditCents > 0
          ? `Crédit UNPRO confirmé — ${formatMoney(state.creditCents, "CAD")}`
          : "Paiement en attente de confirmation",
      done: state.paid || state.creditCents > 0,
    },
    {
      key: "plan",
      label: state.planCode
        ? `Forfait actif — ${state.planCode}`
        : "Forfait en attente d'activation",
      done: state.subscriptionActive,
    },
    {
      key: "account",
      label: activated ? "Compte entrepreneur activé" : "Compte en attente d'activation",
      done: activated,
    },
    {
      key: "published",
      label: state.published
        ? "Profil public visible sur UNPRO"
        : "Publication du profil en cours de validation",
      done: state.published,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Activation — {businessName}</title>
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-success/5 blur-[120px]" />
        </div>

        <div className="relative z-10 max-w-lg w-full">
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-6">
            <motion.div variants={scaleIn} className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/20 mb-4"
              >
                {state.loading ? (
                  <Loader2 className="h-8 w-8 text-success animate-spin" />
                ) : (
                  <CheckCircle2 className="h-8 w-8 text-success" />
                )}
              </motion.div>

              <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">
                {state.loading
                  ? "Vérification de votre activation…"
                  : activated
                    ? "Compte activé"
                    : "Paiement en cours de confirmation"}
              </h1>

              {!state.loading && (
                <p className="text-sm text-muted-foreground">
                  {state.published
                    ? `${businessName} est maintenant visible sur UNPRO.`
                    : activated
                      ? `${businessName} est activée. La mise en ligne publique du profil est en cours de validation.`
                      : `Dès que le paiement est confirmé, ${businessName} sera activée automatiquement.`}
                </p>
              )}

              {!state.loading && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  {(state.paid || state.creditCents > 0) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-3 py-1 text-xs font-semibold text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Plan payé
                    </span>
                  )}
                  {activated ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Entrepreneur activé
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      En attente
                    </span>
                  )}
                </div>
              )}
            </motion.div>

            <motion.div variants={fadeUp}>
              <CardGlass noAnimation>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  État réel de votre activation
                </h3>
                <div className="space-y-2">
                  {checklist.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 py-1">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span
                        className={
                          item.done
                            ? "text-xs text-foreground"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </CardGlass>
            </motion.div>

            <motion.div variants={fadeUp}>
              <CardGlass noAnimation>
                <h3 className="text-sm font-semibold text-foreground mb-3">Prochaines étapes</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate("/entrepreneur/profile-preview")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Eye className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-left text-xs font-medium text-foreground">Voir mon profil public</span>
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => navigate("/pro")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4 text-primary" />
                    <span className="flex-1 text-left text-xs font-medium text-foreground">Accéder à mon tableau de bord</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => navigate("/entrepreneur/assets")}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <Star className="h-4 w-4 text-warning" />
                    <span className="flex-1 text-left text-xs font-medium text-foreground">Compléter les sections avancées</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>
              </CardGlass>
            </motion.div>

            <motion.div variants={fadeUp}>
              <Button
                className="w-full h-13 rounded-xl text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
                onClick={() => navigate("/pro")}
              >
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Aller à mon tableau de bord
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
