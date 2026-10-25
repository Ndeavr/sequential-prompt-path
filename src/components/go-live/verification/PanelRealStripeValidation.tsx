import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle, XCircle } from "lucide-react";

interface StripeCheck {
  label: string;
  status: "unverified" | "failed";
  detail: string;
}

/**
 * Diagnostic strictement en lecture seule.
 *
 * Les traces hébergées ne constituent pas à elles seules la preuve d'un
 * PaymentIntent LIVE réellement réglé et non remboursé. Aucun faux "passed".
 * Ne jamais créer un Checkout, activer un plan ni écrire dans une table ici.
 */
export default function PanelRealStripeValidation() {
  const [checks, setChecks] = useState<StripeCheck[]>([]);
  const [running, setRunning] = useState(false);

  const runReadOnlyAudit = async () => {
    setRunning(true);
    try {
      const sources = [
        { table: "unpro_payment_activation_audit", label: "Journal d'activation serveur" },
        { table: "unpro_stripe_webhook_events", label: "Journal des webhooks Stripe" },
        { table: "billing_checkout_sessions", label: "Sessions Checkout locales" },
      ] as const;

      const results = await Promise.all(
        sources.map(async ({ table, label }): Promise<StripeCheck> => {
          try {
            const { count, error } = await supabase
              .from(table as never)
              .select("id", { count: "exact", head: true });

            if (error) {
              return { label, status: "failed", detail: `Lecture indisponible : ${error.message}` };
            }

            return {
              label,
              status: "unverified",
              detail: `${count ?? 0} trace(s) accessibles. Une trace ne constitue pas une preuve de vente réglée.`,
            };
          } catch (error) {
            return {
              label,
              status: "failed",
              detail: `Lecture impossible : ${error instanceof Error ? error.message : "erreur inconnue"}`,
            };
          }
        }),
      );
      setChecks(results);
    } finally {
      setRunning(false);
    }
  };

  const failed = checks.filter((check) => check.status === "failed").length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Stripe — traces serveur (lecture seule)
          {checks.length > 0 && (
            <Badge variant="outline" className="text-[10px]">
              {failed > 0 ? `${failed} lecture(s) indisponible(s)` : "Paiement non vérifié"}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Ce panneau consulte des traces internes. Il ne crée aucune session, ne déclenche aucune
          activation et ne certifie aucun paiement. Pour valider une activation à 350 $ CA hors
          taxes, rapprocher côté serveur Stripe LIVE, PaymentIntent réglé, webhook authentifié,
          attribution au bon entrepreneur et absence de remboursement.
        </p>
        <Button size="sm" onClick={runReadOnlyAudit} disabled={running} className="h-7 text-xs gap-1">
          <CreditCard className="h-3 w-3" />
          {running ? "Lecture…" : "Consulter les traces"}
        </Button>
        {checks.length > 0 && (
          <div className="space-y-2" role="status">
            {checks.map((check) => (
              <div key={check.label} className="flex items-start gap-2 text-xs">
                {check.status === "failed" ? (
                  <XCircle className="h-3 w-3 shrink-0 text-destructive" />
                ) : (
                  <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
                )}
                <div>
                  <span className="font-medium">{check.label}</span>
                  <p className="text-[10px] text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
