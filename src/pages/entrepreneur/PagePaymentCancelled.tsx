/**
 * UNPRO — Payment Cancelled / Retry Page
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, ArrowRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PagePaymentCancelled() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const quoteId = searchParams.get("quote_id");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-16 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-5">
            <XCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground font-display mb-2">
            Paiement annulé
          </h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Votre paiement n'a pas été complété. Votre simulation est toujours disponible — vous pouvez reprendre à tout moment.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {quoteId && (
            <Button
              onClick={() => navigate(`/entrepreneur/plan-result?quote_id=${quoteId}`)}
              className="w-full h-14 rounded-2xl text-base font-bold gap-2"
              size="lg"
            >
              <RotateCcw className="w-5 h-5" />
              Reprendre le paiement
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate("/entrepreneur/pricing-calculator")}
            className="w-full text-sm gap-2"
          >
            Refaire une simulation
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate("/entrepreneur")}
            className="w-full text-sm"
          >
            Retour à l'accueil
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
