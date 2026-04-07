import { motion } from "framer-motion";
import { MapPin, ShieldCheck, Lock, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const cities = [
  { name: "Montréal", status: "limited", label: "3 places restantes", color: "warning" },
  { name: "Québec", status: "available", label: "Disponible", color: "success" },
  { name: "Laval", status: "limited", label: "2 places restantes", color: "warning" },
  { name: "Longueuil", status: "available", label: "Disponible", color: "success" },
  { name: "Gatineau", status: "available", label: "Disponible", color: "success" },
  { name: "Sherbrooke", status: "exclusive", label: "Exclusivité disponible", color: "primary" },
  { name: "Trois-Rivières", status: "available", label: "Disponible", color: "success" },
  { name: "Drummondville", status: "waitlist", label: "Liste d'attente", color: "muted-foreground" },
];

const statusIcon = {
  available: MapPin,
  limited: Clock,
  exclusive: ShieldCheck,
  waitlist: Lock,
};

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function SectionTerritories({ onTrackCta }: Props) {
  return (
    <section id="section-territories" className="py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground font-display mb-3">
            Places limitées par ville.
            <br />
            <span className="text-primary">Exclusivité possible.</span>
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            UNPRO limite le nombre d'entrepreneurs par secteur pour protéger la qualité du matching et éviter la guerre de prix.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {cities.map((city, i) => {
            const Icon = statusIcon[city.status as keyof typeof statusIcon] || MapPin;
            const colorMap: Record<string, string> = {
              success: "text-success",
              warning: "text-warning",
              primary: "text-primary",
              "muted-foreground": "text-muted-foreground",
            };
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border/40 bg-card/80 p-3 text-center space-y-1.5"
              >
                <Icon className={`w-4 h-4 mx-auto ${colorMap[city.color]}`} />
                <p className="text-sm font-bold text-foreground">{city.name}</p>
                <p className={`text-[10px] font-semibold ${colorMap[city.color]}`}>{city.label}</p>
              </motion.div>
            );
          })}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            variant="outline"
            className="gap-2 font-bold"
            onClick={() => onTrackCta("check_city", "territories")}
          >
            <MapPin className="w-4 h-4" />
            Vérifier ma ville
          </Button>
        </div>
      </div>
    </section>
  );
}
