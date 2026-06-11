/**
 * PageLogout — /logout
 * Vraie déconnexion Supabase, toast, retour accueil.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function PageLogout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    (async () => {
      try {
        await signOut();
        toast.success("Vous avez été déconnecté");
      } catch {
        toast.error("Impossible de fermer votre session");
      } finally {
        setTimeout(() => navigate("/", { replace: true }), 400);
      }
    })();
  }, [signOut, navigate]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <p className="text-base font-medium text-foreground">Fermeture de votre session…</p>
    </div>
  );
}
