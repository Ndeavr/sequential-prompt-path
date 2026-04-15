/**
 * PageBookingInstant — Instant booking with calendar slots + profile gate.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import WidgetInstantBookingSlots from "@/components/intent-funnel/WidgetInstantBookingSlots";
import ModalProfileCompletionGate from "@/components/intent-funnel/ModalProfileCompletionGate";
import { useBookingSlots } from "@/hooks/useIntentFunnel";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function PageBookingInstant() {
  const { contractorId } = useParams<{ contractorId: string }>();
  const { user } = useAuth();
  const { fetchSlots, bookSlot, slots, loading } = useBookingSlots();
  const [showGate, setShowGate] = useState(false);
  const [pendingSlotId, setPendingSlotId] = useState<string | null>(null);
  const [booked, setBooked] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (contractorId) fetchSlots(contractorId);
  }, [contractorId, fetchSlots]);

  const handleSelectSlot = async (slotId: string) => {
    if (!user) {
      setPendingSlotId(slotId);
      setShowGate(true);
      return;
    }

    // Check if profile extended exists
    const { data: profile } = await (supabase as any)
      .from("user_profiles_extended")
      .select("phone, address")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile || !(profile as any).phone || !(profile as any).address) {
      setPendingSlotId(slotId);
      setShowGate(true);
      return;
    }

    await confirmBooking(slotId);
  };

  const confirmBooking = async (slotId: string) => {
    if (!contractorId || !user) return;
    setBooking(true);
    try {
      await bookSlot(contractorId, slotId, user.id);
      setBooked(true);
    } catch (e) {
      console.error("Booking failed:", e);
    } finally {
      setBooking(false);
    }
  };

  const handleGateComplete = async () => {
    setShowGate(false);
    if (pendingSlotId) {
      await confirmBooking(pendingSlotId);
      setPendingSlotId(null);
    }
  };

  if (booked) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-5 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Rendez-vous confirmé!</h1>
          <p className="text-muted-foreground text-sm">Vous recevrez une confirmation par courriel.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Réserver un rendez-vous</title>
        <meta name="description" content="Choisissez un créneau et confirmez votre rendez-vous instantanément." />
      </Helmet>

      <div className="px-5 pt-12 pb-24 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-foreground mb-1">Réserver un rendez-vous</h1>
          <p className="text-sm text-muted-foreground mb-6">Choisissez le créneau qui vous convient.</p>
        </motion.div>

        <WidgetInstantBookingSlots
          slots={slots}
          loading={loading || booking}
          onSelectSlot={handleSelectSlot}
        />
      </div>

      <ModalProfileCompletionGate
        open={showGate}
        onClose={() => setShowGate(false)}
        onComplete={handleGateComplete}
      />
    </MainLayout>
  );
}
