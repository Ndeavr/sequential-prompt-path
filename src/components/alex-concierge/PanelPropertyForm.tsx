/**
 * PanelPropertyForm — Inline property context capture.
 * Asks for address, city, property type. Minimal.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Home, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onSubmit: (address: string, city: string, propertyType: string) => void;
}

const PROPERTY_TYPES = [
  { label: "Maison", value: "maison" },
  { label: "Condo", value: "condo" },
  { label: "Duplex / Triplex", value: "multiplex" },
  { label: "Chalet", value: "chalet" },
];

export default function PanelPropertyForm({ onSubmit }: Props) {
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [propertyType, setPropertyType] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (address && city && propertyType) {
      onSubmit(address, city, propertyType);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Home className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Votre propriété</p>
            <p className="text-xs text-muted-foreground">Pour mieux cibler votre besoin</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Adresse"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="pl-10 h-11"
              required
            />
          </div>

          <Input
            placeholder="Ville"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-11"
            required
          />

          <div className="grid grid-cols-2 gap-2">
            {PROPERTY_TYPES.map((pt) => (
              <button
                key={pt.value}
                type="button"
                onClick={() => setPropertyType(pt.value)}
                className={`h-10 rounded-xl border text-sm font-medium transition-all ${
                  propertyType === pt.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {pt.label}
              </button>
            ))}
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            disabled={!address || !city || !propertyType}
          >
            Continuer
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </form>
      </div>
    </motion.div>
  );
}
