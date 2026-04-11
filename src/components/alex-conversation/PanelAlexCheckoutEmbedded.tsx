/**
 * PanelAlexCheckoutEmbedded — Plan summary + CTA for inline checkout in chat.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { CreditCard, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CheckoutEmbeddedData } from "./types";

interface Props {
  data: CheckoutEmbeddedData;
  onCheckout?: () => void;
}

export default function PanelAlexCheckoutEmbedded({ data, onCheckout }: Props) {
  const [processing, setProcessing] = useState(false);

  const handleCheckout = () => {
    setProcessing(true);
    onCheckout?.();
  };

  const formattedPrice = new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: data.currency || "CAD",
  }).format(data.price);

  const intervalLabel = data.interval === "yearly" ? "/an" : "/mois";

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CreditCard className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Activation — {data.planName}</h4>
      </div>

      <div className="rounded-xl bg-background/50 border border-border/30 p-3">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-foreground">{formattedPrice}</span>
          <span className="text-xs text-muted-foreground">{intervalLabel}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Plan {data.planName} · Taxes en sus
        </p>
      </div>

      <div className="space-y-1.5">
        {["Rendez-vous qualifiés", "Profil vérifié premium", "Visibilité prioritaire"].map(f => (
          <div key={f} className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs text-muted-foreground">{f}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={handleCheckout}
        disabled={processing}
        className="w-full h-10 text-sm gap-2"
      >
        {processing ? "Redirection…" : "Procéder au paiement"}
        {!processing && <ArrowRight className="h-4 w-4" />}
      </Button>
    </motion.div>
  );
}
