/**
 * CardAlexAddressConfirmation — "C'est bien pour votre condo à Laval?" card.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AddressConfirmationData } from "./types";

interface Props {
  data: AddressConfirmationData;
  onConfirm?: (address: string) => void;
  onEdit?: (newAddress: string) => void;
}

export default function CardAlexAddressConfirmation({ data, onConfirm, onEdit }: Props) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.address);
  const [confirmed, setConfirmed] = useState(false);

  if (confirmed) {
    return (
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl border border-green-500/20 bg-green-500/5 p-3 flex items-center gap-2">
        <Check className="h-4 w-4 text-green-500" />
        <span className="text-sm text-foreground">Adresse confirmée</span>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Confirmer l'adresse</h4>
      </div>

      {!editing ? (
        <>
          <div className="rounded-xl bg-background/50 border border-border/30 p-3">
            <p className="text-sm text-foreground">{data.address}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{data.city}{data.postalCode ? ` · ${data.postalCode}` : ""}</p>
            {data.propertyType && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.propertyType}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={() => { setConfirmed(true); onConfirm?.(data.address); }}>
              <Check className="h-3 w-3" /> C'est correct
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => setEditing(true)}>
              <Pencil className="h-3 w-3" /> Modifier
            </Button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-9 text-sm" placeholder="Nouvelle adresse" />
          <Button size="sm" className="w-full h-8 text-xs" onClick={() => { setEditing(false); onEdit?.(editValue); }}>
            Mettre à jour
          </Button>
        </div>
      )}
    </motion.div>
  );
}
