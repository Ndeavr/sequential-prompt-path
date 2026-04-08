/**
 * FormCouponCodeInline — Premium inline coupon field for checkout
 * Includes input, apply/remove buttons, validation feedback, and price breakdown
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Check, X, Loader2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useValidateCoupon, type CouponValidationResult } from "@/hooks/useCoupons";

interface FormCouponCodeInlineProps {
  planCode: string;
  billingInterval: string;
  basePrice: number; // in dollars
  onCouponChange: (result: CouponValidationResult | null) => void;
}

export default function FormCouponCodeInline({
  planCode,
  billingInterval,
  basePrice,
  onCouponChange,
}: FormCouponCodeInlineProps) {
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState(false);
  const [result, setResult] = useState<CouponValidationResult | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const validate = useValidateCoupon();

  const handleApply = async () => {
    if (!code.trim()) return;
    validate.mutate(
      { code: code.trim(), planCode, billingInterval },
      {
        onSuccess: (res) => {
          setResult(res);
          if (res.valid) {
            setApplied(true);
            onCouponChange(res);
          } else {
            onCouponChange(null);
          }
        },
        onError: () => {
          setResult({ valid: false, reason: "server_error", message: "Erreur de validation" });
          onCouponChange(null);
        },
      }
    );
  };

  const handleRemove = () => {
    setCode("");
    setResult(null);
    setApplied(false);
    onCouponChange(null);
  };

  // Calculate discount
  const discountAmount = result?.valid
    ? result.discount_type === "percentage"
      ? basePrice * (result.discount_value! / 100)
      : (result.discount_value || 0) / 100 // amount is in cents
    : 0;
  const finalPrice = Math.max(0, basePrice - discountAmount);

  return (
    <div className="space-y-3">
      {/* Collapsible trigger */}
      {!applied && !result && (
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Tag className="h-3.5 w-3.5" />
          <span>Vous avez un code promo ?</span>
          {showBreakdown ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      )}

      {/* Input field */}
      <AnimatePresence>
        {(showBreakdown || applied || result) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    if (applied) handleRemove();
                  }}
                  placeholder="Code promo"
                  className="pl-9 h-11 font-mono text-sm uppercase tracking-wider"
                  disabled={validate.isPending || applied}
                  onKeyDown={(e) => e.key === "Enter" && !applied && handleApply()}
                />
              </div>
              {!applied ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 px-4 shrink-0"
                  onClick={handleApply}
                  disabled={validate.isPending || !code.trim()}
                >
                  {validate.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Appliquer"
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-11 px-3 text-muted-foreground shrink-0"
                  onClick={handleRemove}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Validation result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
          >
            {result.valid ? (
              <div className="space-y-3">
                {/* Success badge */}
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1.5 py-1 px-3">
                    <Check className="w-3.5 h-3.5" />
                    Code appliqué
                  </Badge>
                  {result.is_founder_offer && (
                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1 py-1 px-2.5">
                      <Sparkles className="w-3 h-3" />
                      Offre fondateur
                    </Badge>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prix original</span>
                    <span className="line-through text-muted-foreground">{basePrice.toFixed(2)} $</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 font-medium">
                      Rabais{" "}
                      {result.discount_type === "percentage"
                        ? `(${result.discount_value}%)`
                        : ""}
                    </span>
                    <span className="text-green-600 font-medium">-{discountAmount.toFixed(2)} $</span>
                  </div>
                  <div className="border-t border-border/50 pt-2 flex justify-between">
                    <span className="font-semibold text-foreground">Montant facturé aujourd'hui</span>
                    <span className="font-bold text-foreground text-lg">{finalPrice.toFixed(2)} $</span>
                  </div>
                  {result.duration_type === "once" && finalPrice < basePrice && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Puis {basePrice.toFixed(2)} $/{billingInterval === "year" ? "an" : "mois"} après la période promotionnelle
                    </p>
                  )}
                  {result.duration_type === "repeating" && result.duration_in_months && (
                    <p className="text-xs text-muted-foreground pt-1">
                      Rabais appliqué pour {result.duration_in_months} mois, puis {basePrice.toFixed(2)} $/{billingInterval === "year" ? "an" : "mois"}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 bg-destructive/10 text-destructive border border-destructive/20">
                <X className="w-3.5 h-3.5 shrink-0" />
                {result.message || "Code invalide"}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
