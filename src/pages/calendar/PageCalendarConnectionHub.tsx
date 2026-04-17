/**
 * PageCalendarConnectionHub — main hub to connect calendar by role.
 */
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar } from "lucide-react";
import CardCalendarConnectionRole from "@/components/calendar/CardCalendarConnectionRole";
import WidgetCalendarAvailabilityPreview from "@/components/calendar/WidgetCalendarAvailabilityPreview";
import { useAuth } from "@/hooks/useAuth";
import { useCalendarConnections } from "@/hooks/useCalendarConnection";

export default function PageCalendarConnectionHub() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { role: authRole, isAuthenticated } = useAuth();
  const queryRole = params.get("role");
  const role = (queryRole as "homeowner" | "contractor" | "professional") ??
               (authRole === "contractor" ? "contractor" : "homeowner");
  const surface = params.get("surface") ?? "hub";
  const { isConnected } = useCalendarConnections();

  return (
    <MainLayout>
      <Helmet>
        <title>Connecter mon calendrier — UNPRO</title>
        <meta name="description" content="Connectez Google ou Apple Calendar pour des rendez-vous sans friction. UNPRO lit votre disponibilité, jamais les détails." />
        <link rel="canonical" href="https://unpro.ca/calendar/connect" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-6 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Retour
          </Button>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Connecter mon calendrier</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Plus de rendez-vous qui marchent vraiment.
              </p>
            </div>
          </div>

          {!isAuthenticated ? (
            <div className="rounded-2xl border border-border/40 bg-card/60 p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">Connectez-vous pour lier votre calendrier.</p>
              <Button onClick={() => navigate("/role")} className="rounded-full">Se connecter</Button>
            </div>
          ) : (
            <div className="space-y-6">
              <CardCalendarConnectionRole role={role} surface={surface} />
              {isConnected && <WidgetCalendarAvailabilityPreview role={role} />}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
