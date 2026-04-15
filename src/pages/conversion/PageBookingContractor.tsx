import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Calendar, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAlexContext, useCreateBookingSession, useConvertProspect } from "@/hooks/useEmailConversion";

const SLOTS = [
  { label: "Demain 10h", value: new Date(Date.now() + 86400000).toISOString().split("T")[0] + "T10:00:00" },
  { label: "Demain 14h", value: new Date(Date.now() + 86400000).toISOString().split("T")[0] + "T14:00:00" },
  { label: "Dans 2 jours 10h", value: new Date(Date.now() + 172800000).toISOString().split("T")[0] + "T10:00:00" },
  { label: "Dans 2 jours 15h", value: new Date(Date.now() + 172800000).toISOString().split("T")[0] + "T15:00:00" },
  { label: "Dans 3 jours 9h", value: new Date(Date.now() + 259200000).toISOString().split("T")[0] + "T09:00:00" },
  { label: "Dans 3 jours 13h", value: new Date(Date.now() + 259200000).toISOString().split("T")[0] + "T13:00:00" },
];

const PageBookingContractor = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: alexData, isLoading } = useAlexContext(token);
  const bookingMutation = useCreateBookingSession();
  const convertMutation = useConvertProspect();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);

  const context = alexData?.context;
  const companyName = context?.company_name || "Votre entreprise";

  const handleBook = () => {
    if (!token || !selectedSlot) return;
    bookingMutation.mutate(
      { token, company_name: companyName, city: context?.city, category: context?.category, scheduled_at: selectedSlot },
      {
        onSuccess: () => {
          convertMutation.mutate({ token, company_name: companyName, city: context?.city, category: context?.category });
          setBooked(true);
          toast.success("Rendez-vous confirmé!");
        },
        onError: () => toast.error("Erreur — réessayez"),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (booked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center space-y-4 px-6">
          <CheckCircle className="h-16 w-16 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Rendez-vous confirmé!</h1>
          <p className="text-sm text-muted-foreground">
            {companyName}, votre démo avec Alex est réservée.
          </p>
          <p className="text-xs text-muted-foreground">Vous recevrez un email de confirmation sous peu.</p>
          <Button onClick={() => navigate("/alex")} className="gap-2 mt-4">
            Parler avec Alex maintenant <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <Calendar className="h-8 w-8 text-primary mx-auto" />
          <h1 className="text-xl font-bold text-foreground">Réserver votre démo</h1>
          <p className="text-sm text-muted-foreground">{companyName} — Choisissez un créneau</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SLOTS.map((slot) => (
            <button
              key={slot.value}
              onClick={() => setSelectedSlot(slot.value)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedSlot === slot.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border/30 bg-card hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`h-3.5 w-3.5 ${selectedSlot === slot.value ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-medium text-foreground">{slot.label}</span>
              </div>
            </button>
          ))}
        </div>

        <Button
          onClick={handleBook}
          disabled={!selectedSlot || bookingMutation.isPending}
          className="w-full h-12 text-base font-semibold gap-2 rounded-xl"
          size="lg"
        >
          {bookingMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <CheckCircle className="h-5 w-5" />
              Confirmer le rendez-vous
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default PageBookingContractor;
