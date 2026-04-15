import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ModalForceRetestProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stepName: string;
  isLoading?: boolean;
}

export default function ModalForceRetest({ open, onClose, onConfirm, stepName, isLoading }: ModalForceRetestProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Re-tester : {stepName}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Ce test sera relancé en conditions réelles. Les résultats précédents seront archivés.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>Annuler</Button>
          <Button size="sm" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "En cours…" : "Confirmer le re-test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
