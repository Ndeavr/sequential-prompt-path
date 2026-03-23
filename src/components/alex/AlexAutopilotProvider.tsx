/**
 * AlexAutopilotProvider — Drop-in wrapper that shows the autopilot suggestion banner.
 * Place alongside AlexGlobalOrb or at layout level.
 */
import { useAlexAutopilot } from "@/hooks/useAlexAutopilot";
import AlexAutopilotBanner from "@/components/alex/AlexAutopilotBanner";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AlexAutopilotProviderProps {
  hasScore?: boolean;
  hasUploadedPhoto?: boolean;
  hasPendingBooking?: boolean;
  selectedPlan?: string | null;
  activePropertyId?: string | null;
}

export default function AlexAutopilotProvider(props: AlexAutopilotProviderProps) {
  const navigate = useNavigate();
  const { suggestion, dismiss, act, isActive } = useAlexAutopilot(props);

  const handleAct = () => {
    const uiActions = act();
    if (!uiActions) return;

    for (const action of uiActions) {
      switch (action.type) {
        case "navigate":
          if (action.target) navigate(action.target);
          break;
        case "open_upload":
          toast.info("Ouvre la caméra ou sélectionne une photo");
          break;
        case "show_score":
          navigate("/dashboard/properties");
          break;
        case "open_booking":
          navigate("/dashboard/appointments");
          break;
        case "show_plan_recommendation":
          navigate("/pricing");
          break;
        default:
          break;
      }
    }
  };

  if (!isActive) return null;

  return (
    <AlexAutopilotBanner
      suggestion={suggestion}
      onAct={handleAct}
      onDismiss={dismiss}
    />
  );
}
