import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Brain, FolderOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ModalChoixTypeSoumission({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Que souhaitez-vous faire?</DialogTitle>
          <DialogDescription>Choisissez le type d'action pour vos soumissions.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <Button
            asChild
            variant="outline"
            className="w-full justify-start gap-3 h-auto p-4 rounded-xl hover:border-primary/40 hover:bg-primary/5"
            onClick={() => onOpenChange(false)}
          >
            <Link to="/analyse-soumissions">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Analyser jusqu'à 3 soumissions</p>
                <p className="text-xs text-muted-foreground">Comparer plusieurs offres avec l'IA</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="w-full justify-start gap-3 h-auto p-4 rounded-xl hover:border-amber-500/40 hover:bg-amber-500/5"
            onClick={() => onOpenChange(false)}
          >
            <Link to="/dossier-soumissions/ajouter">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <FolderOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Ajouter une soumission au dossier</p>
                <p className="text-xs text-muted-foreground">Archiver une soumission dans le dossier de la propriété</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto shrink-0" />
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
