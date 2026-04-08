import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, MessageCircle, ShieldCheck, Zap } from "lucide-react";
import CardValueComparisonProjects from "./CardValueComparisonProjects";
import GraphValueDistribution from "./GraphValueDistribution";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoosePlan?: () => void;
}

export default function ModalRendezVousValueExplanation({ open, onOpenChange, onChoosePlan }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-border/30 bg-background">
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="p-5 md:p-6 space-y-6"
            >
              {/* STEP 1 — Hook */}
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2 mb-1">
                  <Sparkles className="h-5 w-5 text-accent" />
                  Pourquoi ce n'est pas un nombre fixe ?
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Parce que tous les projets n'ont pas la même valeur.
                </p>
              </div>

              {/* STEP 2 — Visual explanation */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Comparaison par taille de projet
                </p>
                <CardValueComparisonProjects />
              </div>

              {/* STEP 3 — Key message */}
              <div className="rounded-xl bg-primary/5 border border-primary/15 p-4 text-center space-y-2">
                <p className="text-sm font-bold text-foreground">
                  <Zap className="inline h-4 w-4 text-primary mr-1" />
                  UNPRO optimise votre revenu, pas le nombre de visites.
                </p>
                <p className="text-xs text-muted-foreground">
                  5 rendez-vous XL peuvent valoir plus que 20 petits projets.
                </p>
              </div>

              {/* STEP 4 — Simulation */}
              <GraphValueDistribution />

              {/* STEP 5 — Différenciateur */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center">
                  <p className="text-xs font-semibold text-destructive mb-1">Autres plateformes</p>
                  <p className="text-[11px] text-muted-foreground">Volume de leads partagés</p>
                </div>
                <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-center">
                  <ShieldCheck className="h-4 w-4 text-success mx-auto mb-1" />
                  <p className="text-xs font-semibold text-success mb-1">UNPRO</p>
                  <p className="text-[11px] text-muted-foreground">Rendez-vous qualifiés et exclusifs</p>
                </div>
              </div>

              {/* STEP 6 — Alex Assist */}
              <div className="rounded-xl bg-accent/5 border border-accent/15 p-4 flex items-start gap-3">
                <MessageCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Alex, votre conseiller IA</p>
                  <p className="text-xs text-muted-foreground italic">
                    « Tu préfères 10 petits jobs… ou 3 gros contrats sécurisés ? Laisse-moi t'aider à choisir le bon plan. »
                  </p>
                </div>
              </div>

              {/* STEP 7 — CTA */}
              <div className="flex flex-col gap-2 pt-2">
                <Button
                  size="lg"
                  className="w-full rounded-xl shadow-glow"
                  onClick={() => {
                    onOpenChange(false);
                    onChoosePlan?.();
                  }}
                >
                  Choisir mon plan
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={() => onOpenChange(false)}
                >
                  Voir estimation personnalisée
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
