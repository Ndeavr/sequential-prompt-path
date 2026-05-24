/**
 * PageNoMatchFallback — Premium no-match conversion page.
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useEffect } from "react";
import { useNoMatchRecovery } from "@/hooks/useNoMatchRecovery";
import NoMatchConversionCard from "@/components/conversion/NoMatchConversionCard";
import CardJoinWaitlist from "@/components/alex/no-match/CardJoinWaitlist";
import PanelWaitlistConfirmation from "@/components/alex/no-match/PanelWaitlistConfirmation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PageNoMatchFallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session") || "anonymous";
  const service = params.get("service") || "";
  const city = params.get("city") || "";

  const {
    step, detect, joinWaitlist, showWaitlistForm, isJoining,
  } = useNoMatchRecovery(sessionId);

  useEffect(() => {
    if (step === "idle") detect(service || "service", city || "votre secteur");
  }, []);

  return (
    <>
      <Helmet>
        <title>Recherche intelligente — UNPRO</title>
        <meta name="description" content="L'IA UNPRO élargit votre recherche et vous notifie dès qu'un professionnel compatible devient disponible." />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="p-4 flex items-center gap-3 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground">Recherche intelligente</h1>
        </header>

        <main className="flex-1 p-4 space-y-5 max-w-lg mx-auto w-full">
          {(step === "detected" || step === "alternatives" || step === "idle") && (
            <NoMatchConversionCard
              variant="page"
              service={service}
              city={city}
              onActivateAlerts={showWaitlistForm}
              onAlex={() => navigate("/alex")}
            />
          )}

          {step === "waitlist_form" && (
            <CardJoinWaitlist
              service={service}
              city={city}
              isLoading={isJoining}
              onSubmit={(data) => joinWaitlist({ ...data, service, city })}
            />
          )}

          {step === "waitlist_confirmed" && (
            <PanelWaitlistConfirmation
              service={service}
              city={city}
              onBackToHome={() => navigate("/")}
            />
          )}
        </main>
      </div>
    </>
  );
}
