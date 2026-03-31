/**
 * UNPRO — Guard Route Post Analysis
 * Prevents users with active AIPP flows from accessing the dashboard.
 * Forces them back into the analysis flow at their current step.
 */
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  getActiveFlowSession,
  getStepRoute,
  type FlowSession,
} from "@/services/flowStateService";

interface Props {
  children: React.ReactNode;
  /** Only block if user has this flow type active */
  flowType?: string;
}

export default function GuardRoutePostAnalysis({ children, flowType = "AIPP_ANALYSIS" }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getActiveFlowSession(flowType as "AIPP_ANALYSIS").then((session) => {
      if (cancelled) return;

      if (session && session.status === "in_progress" && session.step !== "completed") {
        const targetRoute = getStepRoute(session.step);
        // Don't redirect if already on a flow page
        if (!location.pathname.startsWith("/entrepreneur")) {
          navigate(targetRoute, { replace: true });
          return;
        }
      }
      setChecked(true);
    });

    return () => { cancelled = true; };
  }, [navigate, location.pathname, flowType]);

  if (!checked) return null;
  return <>{children}</>;
}
