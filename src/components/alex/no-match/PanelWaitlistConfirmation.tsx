import { CheckCircle2, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  service: string;
  city: string;
  onBackToHome?: () => void;
}

export default function PanelWaitlistConfirmation({ service, city, onBackToHome }: Props) {
  return (
    <div className="text-center space-y-4 py-6">
      <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-foreground">Vous êtes sur la liste</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Je surveille pour vous et je vous contacte dès que j'ai une bonne option en <strong>{service}</strong> à <strong>{city}</strong>.
        </p>
      </div>
      <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
        <Bell className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground text-left">
          Vous recevrez une notification par téléphone ou courriel dès qu'un professionnel est disponible.
        </p>
      </div>
      {onBackToHome && (
        <Button variant="outline" onClick={onBackToHome} className="mt-2">
          Retour à l'accueil
        </Button>
      )}
    </div>
  );
}
