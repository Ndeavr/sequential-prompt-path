import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Crown, X, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  planName: string;
  foundersPrice: number;
  regularPrice: number;
  onAccept: () => void;
}

export default function ModalHeyButWaitUpgrade({ open, onClose, planName, foundersPrice, regularPrice, onAccept }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            className="relative bg-card border rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            initial={{ scale: 0.8, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            {/* Header animation */}
            <motion.div
              className="bg-primary text-primary-foreground p-4 text-center"
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 0] }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Crown className="w-8 h-8 mx-auto mb-2" />
              </motion.div>
              <h3 className="text-lg font-bold">Hey, attendez! 🎉</h3>
              <p className="text-sm opacity-90">Une offre exclusive pour vous</p>
            </motion.div>

            <div className="p-5 space-y-4">
              <div className="text-center">
                <p className="text-sm">
                  Le plan <strong>{planName}</strong> est disponible avec l'offre <strong>Fondateurs</strong>
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground line-through">{regularPrice}$/mois</div>
                  <div className="text-xs text-muted-foreground">Régulier</div>
                </div>
                <Sparkles className="w-5 h-5 text-primary" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{foundersPrice}$/mois</div>
                  <div className="text-xs text-primary font-medium">Prix gelé à vie</div>
                </div>
              </div>

              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ Prix gelé à vie — jamais d'augmentation</li>
                <li>✓ Support prioritaire dédié</li>
                <li>✓ Badge Fondateur sur votre profil</li>
                <li>✓ Places limitées par ville</li>
              </ul>

              <div className="space-y-2">
                <Button onClick={onAccept} className="w-full font-semibold gap-2">
                  <Crown className="w-4 h-4" /> Oui, je veux l'offre Fondateurs!
                </Button>
                <Button variant="ghost" onClick={onClose} className="w-full text-xs text-muted-foreground">
                  Non merci, garder le plan régulier
                </Button>
              </div>
            </div>

            <button onClick={onClose} className="absolute top-3 right-3 text-primary-foreground/70 hover:text-primary-foreground">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
