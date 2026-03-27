/**
 * UNPRO — Booking Payment Success Page
 * Verifies Stripe payment and shows confirmation.
 */
import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingPaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "paid" | "error">("verifying");
  const emailSent = useRef(false);

  const bookingId = params.get("booking_id");
  const sessionId = params.get("session_id");
  const clientEmail = params.get("email");

  useEffect(() => {
    if (!bookingId || !sessionId) {
      setStatus("error");
      return;
    }

    supabase.functions
      .invoke("verify-booking-payment", {
        body: { session_id: sessionId, booking_id: bookingId },
      })
      .then(({ data, error }) => {
        if (error || !data?.paid) {
          setStatus("error");
        } else {
          setStatus("paid");
          // Send booking confirmation email (best-effort, once)
          if (clientEmail && !emailSent.current) {
            emailSent.current = true;
            supabase.functions.invoke("send-transactional-email", {
              body: {
                templateName: "booking-confirmation",
                recipientEmail: clientEmail,
                idempotencyKey: `booking-confirm-${bookingId}`,
                templateData: {
                  clientName: data.client_name || undefined,
                  contractorName: data.contractor_name || undefined,
                  serviceType: data.service_type || undefined,
                  date: data.date || undefined,
                  time: data.time || undefined,
                },
              },
            }).catch(() => {});
          }
        }
      })
      .catch(() => setStatus("error"));
  }, [bookingId, sessionId, clientEmail]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "verifying" && (
          <>
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-bold text-foreground">Vérification du paiement...</h1>
            <p className="text-muted-foreground">Un instant, on confirme votre réservation.</p>
          </>
        )}

        {status === "paid" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Paiement confirmé!</h1>
            <p className="text-muted-foreground">
              Votre rendez-vous est confirmé et payé. Vous recevrez un rappel avant la visite.
            </p>
            <Button onClick={() => navigate("/")} className="w-full">
              Retour à l'accueil
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <h1 className="text-xl font-bold text-foreground">Erreur de vérification</h1>
            <p className="text-muted-foreground">
              Le paiement n'a pas pu être vérifié. Contactez le support si le montant a été prélevé.
            </p>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Retour
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
