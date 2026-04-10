import { motion } from "framer-motion";
import { MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  reason?: string;
  onAddAddress?: () => void;
}

export default function CardAlexAddressRequired({ reason, onAddAddress }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <MapPin className="w-3.5 h-3.5" />
        Adresse requise
      </div>

      <p className="text-sm text-foreground">
        {reason || "Votre adresse permet de trouver les meilleurs entrepreneurs dans votre secteur."}
      </p>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-1 h-1 rounded-full bg-green-500" />
        <span>Vos données sont protégées et ne sont jamais partagées sans votre accord.</span>
      </div>

      <Button
        size="sm"
        className="w-full gap-1"
        onClick={onAddAddress}
      >
        <MapPin className="w-3.5 h-3.5" />
        Ajouter mon adresse
        <ChevronRight className="w-3.5 h-3.5" />
      </Button>
    </motion.div>
  );
}
