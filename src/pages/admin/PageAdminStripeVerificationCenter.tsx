import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useStripeLiveVerification, useWebhookEvents, useCheckoutSessions } from "@/hooks/useStripeLiveVerification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Zap, User, Receipt, Shield, ArrowRight, RefreshCw, ExternalLink,
} from "lucide-react";

const stepLabels: Record<string, string> = {
  idle: "En attente",
  checking_health: "Vérification Stripe…",
  importing: "Importation entrepreneur…",
  creating_checkout: "Création checkout…",
  awaiting_payment: "En attente de paiement…",
  verifying_payment: "Vérification paiement…",
  complete: "✅ Vérifié end-to-end",
  error: "❌ Erreur",
};

export default function PageAdminStripeVerificationCenter() {
  const { state, runFullFlow, verifyPayment, reset } = useStripeLiveVerification();
  const { data: webhookData } = useWebhookEvents();
  const { data: checkoutSessions } = useCheckoutSessions();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Auto-verify on return from Stripe
  useEffect(() => {
    const status = searchParams.get("status");
    const sessionId = searchParams.get("session_id");
    if (status === "success" && sessionId) {
      verifyPayment(sessionId);
    }
  }, [searchParams, verifyPayment]);

  const isRunning = !["idle", "complete", "error", "awaiting_payment"].includes(state.step);

  return (
    <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
      {/* Hero */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Stripe Live Verification Center</h1>
            <p className="text-xs text-muted-foreground">Isolation Solution Royal — Plan Signature</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4">
          <Badge variant={state.step === "complete" ? "default" : state.step === "error" ? "destructive" : "secondary"}>
            {stepLabels[state.step]}
          </Badge>
          {state.health && (
            <Badge variant="outline" className="text-[10px]">
              {state.health.livemode ? "🔴 LIVE" : "🟡 TEST"}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={runFullFlow}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Lancer vérification complète
          </Button>
          {state.step === "awaiting_payment" && state.checkout && (
            <Button variant="outline" onClick={() => window.open(state.checkout!.url, "_blank")} className="gap-2">
              <ExternalLink className="h-4 w-4" /> Ouvrir Checkout
            </Button>
          )}
          {state.step !== "idle" && (
            <Button variant="ghost" size="sm" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error */}
      {state.error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
            <p className="text-sm text-destructive">{state.error}</p>
          </CardContent>
        </Card>
      )}

      {/* Health */}
      {state.health && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Connexion Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center gap-2 text-xs">
              {state.health.connected ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              )}
              <span>{state.health.connected ? "Connecté" : "Non connecté"}</span>
              {state.health.account_id && (
                <span className="text-muted-foreground font-mono">{state.health.account_id}</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contractor */}
      {state.contractor && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" /> Entrepreneur importé
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Entreprise</span>
              <p className="font-medium">{state.contractor.business_name}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Domaine</span>
              <p className="font-medium">{state.contractor.domain}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Catégorie</span>
              <p className="font-medium">{state.contractor.category}</p>
            </div>
            <div>
              <span className="text-muted-foreground">ID</span>
              <p className="font-mono text-[10px] truncate">{state.contractor.id}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Checkout */}
      {state.checkout && (
        <Card className={state.step === "awaiting_payment" ? "border-amber-500/50 animate-pulse" : ""}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Checkout Stripe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Montant</span>
                <p className="font-bold text-lg">{(state.checkout.amount_charged / 100).toFixed(2)} $ CAD</p>
              </div>
              <div>
                <span className="text-muted-foreground">Plan</span>
                <p className="font-medium">Signature</p>
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Session ID</span>
              <p className="font-mono text-[10px] truncate">{state.checkout.session_id}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Coupon</span>
              <p className="font-mono text-[10px]">{state.checkout.coupon_id}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Result */}
      {state.payment && (
        <Card className={state.payment.payment_status === "paid" ? "border-green-500/50 bg-green-500/5" : "border-destructive/50"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {state.payment.payment_status === "paid" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              Résultat paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Statut</span>
              <p className="font-medium">{state.payment.payment_status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Abonnement</span>
              <p className="font-mono text-[10px] truncate">{state.payment.subscription_id || "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Verdict */}
      {state.step === "complete" && (
        <Card className="border-green-500 bg-gradient-to-br from-green-500/10 to-transparent">
          <CardContent className="p-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h2 className="text-lg font-bold text-green-400">✅ Stripe verified end-to-end</h2>
            <div className="grid grid-cols-2 gap-1 text-xs text-left max-w-sm mx-auto">
              {[
                "Entrepreneur importé",
                "Client Stripe créé",
                "Coupon fondateur appliqué",
                "Checkout complété",
                "Paiement confirmé (1,00 $)",
                "Abonnement actif",
                "Profil activé",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline: webhook events */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Événements Webhook récents</CardTitle>
        </CardHeader>
        <CardContent>
          {(!webhookData?.webhook_events?.length && !webhookData?.billing_log_events?.length) ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun événement reçu</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {(webhookData?.webhook_events || []).map((ev: any) => (
                <div key={ev.id} className="flex items-center gap-2 text-xs border rounded p-2">
                  <Badge variant="outline" className="text-[10px] shrink-0">{ev.event_type}</Badge>
                  <span className="text-muted-foreground">{ev.delivery_status}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {new Date(ev.received_at).toLocaleTimeString("fr-CA")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Checkout Sessions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Sessions Checkout</CardTitle>
        </CardHeader>
        <CardContent>
          {!checkoutSessions?.length ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucune session</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {checkoutSessions.map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 text-xs border rounded p-2">
                  <Badge
                    variant={s.payment_status === "paid" ? "default" : "secondary"}
                    className="text-[10px] shrink-0"
                  >
                    {s.payment_status}
                  </Badge>
                  <span className="font-mono truncate text-[10px]">{s.stripe_checkout_session_id}</span>
                  <span className="ml-auto font-medium">{(s.amount_total / 100).toFixed(2)} $</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
