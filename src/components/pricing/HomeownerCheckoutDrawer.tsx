/**
 * HomeownerCheckoutDrawer — Modal checkout for homeowner plans
 * Supports promo code entry + redirects to Stripe Checkout
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Loader2, Tag, LogIn, Crown, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

interface HomeownerCheckoutDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planCode: "plus" | "signature";
  planName: string;
  price: number;
}

export default function HomeownerCheckoutDrawer({
  open,
  onOpenChange,
  planCode,
  planName,
  price,
}: HomeownerCheckoutDrawerProps) {
  const { session } = useAuth();
  const [promoCode, setPromoCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPromo, setShowPromo] = useState(false);

  const handleCheckout = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-homeowner-checkout", {
        body: { planCode, promoCode: promoCode.trim() || undefined },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du checkout");
    } finally {
      setIsLoading(false);
    }
  };

  const Icon = planCode === "signature" ? Crown : Sparkles;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            Activer le plan {planName}
          </DialogTitle>
          <DialogDescription>
            {price} $ / an — Accès immédiat après paiement
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Plan summary */}
          <div className="rounded-xl border border-border/30 bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Plan {planName}</span>
              <span className="text-lg font-bold text-foreground">{price} $<span className="text-xs text-muted-foreground font-normal"> / an</span></span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {planCode === "plus"
                ? "Jusqu'à 3 adresses, analyses illimitées, comparaison de soumissions"
                : "Jusqu'à 5 adresses, accompagnement Alex avancé, vue consolidée premium"}
            </p>
          </div>

          {/* Promo code */}
          {showPromo ? (
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground">Code promo</label>
              <Input
                placeholder="Entrez votre code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="uppercase"
              />
            </div>
          ) : (
            <button
              onClick={() => setShowPromo(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Tag className="h-3.5 w-3.5" />
              J'ai un code promo
            </button>
          )}

          {/* CTA */}
          <Button
            onClick={handleCheckout}
            disabled={isLoading}
            size="lg"
            className="w-full rounded-xl font-bold"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            {isLoading ? "Redirection…" : "Procéder au paiement"}
          </Button>

          {/* Login link */}
          {!session && (
            <div className="text-center pt-1">
              <Link
                to={`/auth?redirect=/tarifs?tab=proprietaires`}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <LogIn className="h-3.5 w-3.5" />
                Déjà un compte? Se connecter d'abord
              </Link>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/60 text-center">
            Paiement sécurisé via Stripe. Annulation possible à tout moment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
