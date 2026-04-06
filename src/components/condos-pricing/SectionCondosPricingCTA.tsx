import { motion } from "framer-motion";
import { ArrowRight, Coffee, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { calculateCondoPrice, getPricePerUnitPerMonth } from "@/lib/condoDirectPricing";
import { useNavigate } from "react-router-dom";

interface Props {
  units: number;
}

export default function SectionCondosPricingCTA({ units }: Props) {
  const navigate = useNavigate();
  const monthly = getPricePerUnitPerMonth(units);
  const total = calculateCondoPrice(units);

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card rounded-2xl p-6 border border-primary/20 text-center space-y-5"
    >
      <div className="flex items-center justify-center gap-2 text-primary">
        <Coffee className="w-4 h-4" />
        <p className="text-sm font-medium">
          Moins qu'un café par unité. Plus de contrôle sur votre immeuble.
        </p>
      </div>

      <p className="text-muted-foreground text-xs">
        {units} unités · {total.toLocaleString("fr-CA")} $ / an · {monthly.toFixed(2)} $ / unité / mois
      </p>

      <Button
        size="lg"
        className="w-full sm:w-auto px-8 gap-2 font-semibold"
        onClick={() => navigate("/copropriete")}
      >
        Créer mon Passeport Immeuble
        <ArrowRight className="w-4 h-4" />
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="w-3 h-3" />
        Nombre d'unités = votre prix. Rien de plus.
      </div>
    </motion.section>
  );
}
