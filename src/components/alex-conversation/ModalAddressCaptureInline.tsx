/**
 * ModalAddressCaptureInline — Address capture modal that appears within
 * the chat flow when an address is needed for booking.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  onSubmit: (address: { street: string; city: string; postalCode: string }) => void;
  onDismiss?: () => void;
  prefillCity?: string;
}

export default function ModalAddressCaptureInline({ onSubmit, onDismiss, prefillCity }: Props) {
  const [street, setStreet] = useState("");
  const [city, setCity] = useState(prefillCity || "");
  const [postalCode, setPostalCode] = useState("");

  const canSubmit = street.trim().length > 3 && city.trim().length > 2;

  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Adresse du rendez-vous</h4>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Adresse</Label>
          <Input
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 rue Principale"
            className="h-9 text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Ville</Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Montréal"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Code postal</Label>
            <Input
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="H2X 1Y4"
              className="h-9 text-sm"
            />
          </div>
        </div>
      </div>

      <Button
        onClick={() => onSubmit({ street, city, postalCode })}
        disabled={!canSubmit}
        className="w-full h-9 text-sm"
        size="sm"
      >
        Confirmer l'adresse
      </Button>
    </motion.div>
  );
}
