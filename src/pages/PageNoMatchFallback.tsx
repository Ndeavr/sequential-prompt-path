/**
 * PageNoMatchFallback — No match recovery flow page
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useNoMatchRecovery } from "@/hooks/useNoMatchRecovery";
import BannerNoMatchPrimary from "@/components/alex/no-match/BannerNoMatchPrimary";
import CardAlternativeOptions from "@/components/alex/no-match/CardAlternativeOptions";
import CardJoinWaitlist from "@/components/alex/no-match/CardJoinWaitlist";
import PanelWaitlistConfirmation from "@/components/alex/no-match/PanelWaitlistConfirmation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mic } from "lucide-react";
import { useEffect } from "react";

export default function PageNoMatchFallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sessionId = params.get("session") || "anonymous";
  const service = params.get("service") || "service demandé";
  const city = params.get("city") || "votre ville";

  const {
    step, statusCopy, alexMessage,
    detect, joinWaitlist, showAlternatives, showWaitlistForm, reset,
    isJoining,
  } = useNoMatchRecovery(sessionId);

  useEffect(() => {
    if (step === "idle") detect(service, city);
  }, []);

  return (
    <>
      <Helmet>
        <title>Aucun match trouvé — UNPRO</title>
        <meta name="description" content="Aucun professionnel disponible pour le moment. Explorez les alternatives ou rejoignez la liste d'attente." />
      </Helmet>
      <div className="min-h-screen bg-background flex flex-col">
        <header className="p-4 flex items-center gap-3 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold text-foreground">Recherche en cours</h1>
        </header>

        <main className="flex-1 p-4 space-y-5 max-w-lg mx-auto w-full">
          {/* Alex avatar + message */}
          <div className="flex items-start gap-3">
            <div className="shrink-0 h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div className="bg-muted/40 rounded-xl rounded-tl-sm p-3">
              <p className="text-sm text-foreground leading-relaxed">
                {alexMessage || "Je cherche les meilleures options pour vous…"}
              </p>
            </div>
          </div>

          {(step === "detected" || step === "alternatives") && statusCopy && (
            <BannerNoMatchPrimary message={statusCopy} />
          )}

          {step === "detected" && (
            <div className="space-y-3">
              <Button className="w-full" onClick={showWaitlistForm}>
                Me prévenir dès qu'il y a un match
              </Button>
              <Button variant="outline" className="w-full" onClick={showAlternatives}>
                Voir d'autres options
              </Button>
            </div>
          )}

          {step === "alternatives" && (
            <CardAlternativeOptions
              onExpandRadius={() => navigate(`/?radius=50&city=${city}&service=${service}`)}
              onAcceptDelay={showWaitlistForm}
              onChangeService={() => navigate("/")}
              onJoinWaitlist={showWaitlistForm}
              onWriteInstead={() => navigate("/alex")}
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
