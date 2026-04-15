/**
 * ModalProfileCompletionGate — Asks for missing profile fields before booking.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function ModalProfileCompletionGate({ open, onClose, onComplete }: Props) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!user || !phone.trim() || !address.trim()) return;
    setSaving(true);

    try {
      await (supabase as any).from("user_profiles_extended").upsert({
        user_id: user.id,
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim() || null,
      });

      onComplete();
    } catch (e) {
      console.error("Profile save failed:", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card border border-border/60 rounded-t-2xl sm:rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Complétez votre profil</h2>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-5">
              Pour confirmer votre rendez-vous, nous avons besoin de quelques informations.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Téléphone *</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(514) 555-1234"
                  className="w-full h-11 rounded-xl px-4 bg-muted/50 border border-border/60 text-foreground text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse *</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 rue Principale"
                  className="w-full h-11 rounded-xl px-4 bg-muted/50 border border-border/60 text-foreground text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ville</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Montréal"
                  className="w-full h-11 rounded-xl px-4 bg-muted/50 border border-border/60 text-foreground text-sm
                    focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={!phone.trim() || !address.trim() || saving}
              className="w-full mt-5 py-3 rounded-xl font-semibold text-sm
                bg-primary text-primary-foreground
                disabled:opacity-40 hover:bg-primary/90 active:scale-[0.98]
                transition-all duration-150 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmer et réserver"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
