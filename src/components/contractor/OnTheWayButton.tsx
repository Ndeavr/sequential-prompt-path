import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Navigation } from "lucide-react";

interface OnTheWayButtonProps {
  appointmentId: string;
  alreadyEnRoute?: boolean;
  onDone?: () => void;
}

const OnTheWayButton = ({ appointmentId, alreadyEnRoute, onDone }: OnTheWayButtonProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("contractor-on-the-way", {
      body: { appointmentId },
    });
    if (error || !data?.ok) {
      toast.error(error?.message || data?.error || "Action impossible");
    } else {
      toast.success("Le propriétaire a été notifié.");
      onDone?.();
    }
    setLoading(false);
  };

  if (alreadyEnRoute) {
    return (
      <Button size="sm" variant="outline" disabled className="gap-1.5 text-xs">
        <Navigation className="h-3.5 w-3.5" /> En route ✓
      </Button>
    );
  }

  return (
    <Button size="sm" variant="default" onClick={handleClick} disabled={loading} className="gap-1.5">
      <Navigation className="h-3.5 w-3.5" />
      {loading ? "Envoi..." : "Je suis en route"}
    </Button>
  );
};

export default OnTheWayButton;
