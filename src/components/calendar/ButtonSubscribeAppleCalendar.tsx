/**
 * ButtonSubscribeAppleCalendar — generates ICS token and opens webcal:// link.
 */
import { Button } from "@/components/ui/button";
import { Apple, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSubscribeAppleCalendar, useCalendarConversionTracking } from "@/hooks/useCalendarConnection";

interface Props {
  surface: string;
  role: string;
  className?: string;
  label?: string;
}

export default function ButtonSubscribeAppleCalendar({ surface, role, className, label }: Props) {
  const { subscribe } = useSubscribeAppleCalendar();
  const { track } = useCalendarConversionTracking();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    await track({ surface, role_context: role, provider: "apple", event_type: "connect_clicked" });
    await track({ surface, role_context: role, provider: "apple", event_type: "apple_subscribe_clicked" });
    const result = await subscribe();
    setBusy(false);
    if (result?.webcal_url) {
      // Try to open in Apple Calendar
      window.location.href = result.webcal_url;
      toast.success("Abonnement Apple Calendar créé", {
        description: "Vos rendez-vous UNPRO apparaîtront dans Apple Calendar.",
      });
    } else {
      toast.error("Impossible de créer l'abonnement");
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={busy}
      variant="outline"
      className={`h-11 rounded-xl border-border/40 hover:bg-muted/30 ${className ?? ""}`}
    >
      {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Apple className="w-4 h-4 mr-2" />}
      {label ?? "S'abonner avec Apple Calendar"}
    </Button>
  );
}
