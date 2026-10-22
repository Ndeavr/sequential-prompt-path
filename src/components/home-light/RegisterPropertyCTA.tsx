import { Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { openAuthOverlay } from "@/hooks/useAuthOverlay";
import { saveRoleIntent } from "@/services/auth/roleIntent";

export default function RegisterPropertyCTA({ lang }: { lang: "fr" | "en" }) {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const register = () => {
    const returnPath = "/dashboard/properties/new";
    if (isAuthenticated) {
      navigate(returnPath);
      return;
    }
    saveRoleIntent("homeowner", { returnPath });
    openAuthOverlay({
      label: lang === "fr" ? "Créer mon compte (c’est gratuit)" : "Create my account (it’s free)",
      returnPath,
      action: "register_property",
    });
  };

  return (
    <div className="flex flex-col items-center gap-1 border-t border-border px-4 py-2">
      <Button type="button" variant="outline" disabled={isLoading} onClick={register}
        className="min-h-11 h-auto w-full whitespace-normal gap-2 py-2 text-center text-sm">
        <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
        {lang === "fr" ? "Enregistrer ma propriété maintenant" : "Register my property now"}
      </Button>
      {!isAuthenticated && (
        <Button type="button" variant="link" disabled={isLoading} onClick={register}
          className="min-h-11 h-auto whitespace-normal text-center text-sm">
          {lang === "fr" ? "Créer mon compte (c’est gratuit)" : "Create my account (it’s free)"}
        </Button>
      )}
    </div>
  );
}