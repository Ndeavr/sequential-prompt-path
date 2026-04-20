import { useState } from "react";
import { useKillSwitch, type SystemEnvironmentState } from "@/hooks/useSystemEnvironment";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pause, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  state: SystemEnvironmentState;
}

export default function ButtonKillSwitch({ state }: Props) {
  const ks = useKillSwitch();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isPaused = state.kill_switch_active;

  const handleConfirm = async () => {
    try {
      await ks.mutateAsync({ action: isPaused ? "release" : "pause", reason: "Manual admin action" });
      toast({
        title: isPaused ? "✅ Système repris" : "⏸ Kill switch activé",
        description: isPaused ? "Les opérations reprennent." : "Toutes les campagnes ont été suspendues.",
      });
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          size="sm"
          className={`h-7 px-3 text-xs font-bold ${
            isPaused ? "bg-amber-600 hover:bg-amber-700 text-white" : "bg-red-700 hover:bg-red-800 text-white"
          }`}
        >
          {isPaused ? <><Play className="h-3 w-3 mr-1" /> REPRENDRE</> : <><Pause className="h-3 w-3 mr-1" /> KILL SWITCH</>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPaused ? "Reprendre les opérations ?" : "Activer le Kill Switch ?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isPaused
              ? "Les campagnes et envois automatiques reprendront. Vérifiez d'abord la santé du domaine."
              : "Toutes les campagnes seront mises en pause IMMÉDIATEMENT. Tous les jobs queued/running seront annulés. Action réversible."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={ks.isPending}
            className={isPaused ? "bg-amber-600 hover:bg-amber-700" : "bg-red-700 hover:bg-red-800"}
          >
            {ks.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isPaused ? "Reprendre" : "PAUSE TOUT"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
