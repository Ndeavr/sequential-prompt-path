/**
 * PageCalendarConnectionFailure — error landing.
 */
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

const REASON_LABELS: Record<string, string> = {
  token_exchange: "Le serveur Google a rejeté l'échange de jetons.",
  missing_code: "Aucun code d'autorisation reçu.",
  access_denied: "Vous avez refusé la permission.",
  server: "Erreur serveur. Réessayez dans un instant.",
};

export default function PageCalendarConnectionFailure() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const reason = params.get("reason") ?? "unknown";
  const label = REASON_LABELS[reason] ?? "Une erreur est survenue.";

  return (
    <MainLayout>
      <Helmet><title>Connexion échouée — UNPRO</title></Helmet>
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/15 mx-auto flex items-center justify-center mb-3">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Connexion calendrier échouée</h1>
          <p className="text-sm text-muted-foreground mt-2 mb-6">{label}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate("/calendar/connect")} className="rounded-full">Réessayer</Button>
            <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-full">Plus tard</Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
