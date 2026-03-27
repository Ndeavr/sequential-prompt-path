/**
 * PromoCodeInput — Inline promo code validator with real-time feedback
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tag, Check, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface PromoResult {
  valid: boolean;
  discount_type?: string;
  discount_value?: number;
  label?: string;
  reason?: string;
}

interface PromoCodeInputProps {
  planCode: string;
  contractorId?: string;
  onPromoValidated: (code: string | null, result: PromoResult | null) => void;
}

export default function PromoCodeInput({ planCode, contractorId, onPromoValidated }: PromoCodeInputProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromoResult | null>(null);
  const [applied, setApplied] = useState(false);

  const validate = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc("validate_unpro_promo_code", {
        _code: code.trim().toUpperCase(),
        _plan_code: planCode,
        _contractor_id: contractorId || null,
      });

      if (error) throw error;

      const res = data as unknown as PromoResult;
      setResult(res);

      if (res.valid) {
        setApplied(true);
        onPromoValidated(code.trim().toUpperCase(), res);
      } else {
        onPromoValidated(null, null);
      }
    } catch (err: any) {
      setResult({ valid: false, reason: err.message || "Erreur de validation" });
      onPromoValidated(null, null);
    } finally {
      setLoading(false);
    }
  };

  const clearPromo = () => {
    setCode("");
    setResult(null);
    setApplied(false);
    onPromoValidated(null, null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              if (applied) clearPromo();
            }}
            placeholder="Code promo"
            className="pl-9 h-11 font-mono text-sm uppercase tracking-wider"
            disabled={loading || applied}
          />
        </div>
        {!applied ? (
          <Button
            variant="outline"
            size="sm"
            className="h-11 px-4"
            onClick={validate}
            disabled={loading || !code.trim()}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-11 px-3 text-muted-foreground"
            onClick={clearPromo}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`rounded-lg px-3 py-2 text-xs font-medium flex items-center gap-2 ${
              result.valid
                ? "bg-green-500/10 text-green-600 border border-green-500/20"
                : "bg-destructive/10 text-destructive border border-destructive/20"
            }`}
          >
            {result.valid ? (
              <>
                <Check className="w-3.5 h-3.5 shrink-0" />
                {result.label || `${result.discount_value}% de réduction appliquée`}
              </>
            ) : (
              <>
                <X className="w-3.5 h-3.5 shrink-0" />
                {result.reason || "Code invalide"}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
