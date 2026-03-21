/**
 * UNPRO — Booking Payment Cancelled Page
 */
import { useSearchParams, useNavigate } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BookingPaymentCancel() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = params.get("booking_id");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Paiement annulé</h1>
        <p className="text-muted-foreground">
          Votre réservation n'a pas été finalisée. Aucun montant n'a été prélevé.
        </p>
        <div className="space-y-2">
          <Button onClick={() => navigate(-1)} className="w-full">
            Réessayer
          </Button>
          <Button variant="outline" onClick={() => navigate("/")} className="w-full">
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
}
