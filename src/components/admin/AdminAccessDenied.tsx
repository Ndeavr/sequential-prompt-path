/**
 * UNPRO — Admin Access Denied Screen
 * Premium, actionable fallback shown when an authenticated user does not
 * have the admin role. Never a dead-end.
 */
import { useNavigate } from "react-router-dom";
import { Shield, Home, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  reason?: "no_role" | "load_error" | "checking";
  detail?: string;
}

export default function AdminAccessDenied({ reason = "no_role", detail }: Props) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const title =
    reason === "load_error"
      ? "Validation administrateur impossible"
      : "Accès administrateur requis";

  const subtitle =
    reason === "load_error"
      ? "Nous n'avons pas pu confirmer vos droits. Réessayez ou reconnectez-vous."
      : "Votre compte n'a pas les droits administrateur. Contactez l'équipe UNPRO si c'est une erreur.";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>
          {user?.email && (
            <p className="text-xs text-muted-foreground/70 mt-3 font-mono">{user.email}</p>
          )}
          {detail && (
            <p className="text-[11px] text-muted-foreground/60 mt-2 font-mono break-all">{detail}</p>
          )}
        </div>
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Réessayer
          </Button>
          <Button variant="outline" className="w-full" onClick={() => navigate("/")}>
            <Home className="h-4 w-4 mr-2" /> Retour à l'accueil
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={async () => {
              await signOut();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut className="h-4 w-4 mr-2" /> Se reconnecter
          </Button>
        </div>
      </div>
    </div>
  );
}
