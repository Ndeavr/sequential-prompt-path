/**
 * CheckoutPanel — Triggers Stripe checkout for the chosen contractor plan.
 */
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  actionId: string;
  plan_code: string;
}

export default function CheckoutPanel({ plan_code: _planCode }: Props) {
  const navigate = useNavigate();

  return (
    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-3 shadow-[0_0_30px_-12px_hsl(var(--primary))]">
      <div>
        <p className="text-xs uppercase tracking-wide text-primary font-semibold">Plan personnalisé</p>
        <p className="text-lg font-semibold text-foreground mt-1">Calculer mon plan avec Clara</p>
        <p className="text-sm text-muted-foreground">Le montant est calculé après vos objectifs, votre capacité et votre territoire.</p>
      </div>
      <button
        onClick={() => navigate("/entrepreneur/devis-personnalise")}
        className="w-full rounded-xl bg-primary text-primary-foreground py-3 text-sm font-semibold active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-2"
      >
        Calculer mon devis <ArrowRight className="w-4 h-4" />
      </button>
      <p className="text-[10px] text-center text-muted-foreground">
        Aucun paiement avant l'affichage du devis personnalisé.
      </p>
    </div>
  );
}
