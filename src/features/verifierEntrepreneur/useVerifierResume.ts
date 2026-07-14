/**
 * useVerifierResume — Handles post-OTP re-attachment for /verifier-entrepreneur.
 *
 * Trigger: `?resume=<runId>&vid=<visitor_id>` in the URL, OR an authenticated
 * session while a `unpro_verify_last_run_id` is stored locally.
 *
 * Calls verify-attach-anonymous with the current homeowner JWT, then
 * navigates to /proprietaire/verifications/:reportId.
 */
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { clearLastRun, getLastRunId, getVisitorId } from "./visitorId";

export function useVerifierResume() {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const { session, isLoading } = useAuth();
  const inflight = useRef(false);

  useEffect(() => {
    if (isLoading || inflight.current) return;
    if (!session?.user) return;

    const paramRunId = sp.get("resume");
    const paramVid = sp.get("vid");
    const storedRunId = getLastRunId();
    const runId = paramRunId || storedRunId;
    if (!runId) return;

    const visitorId = paramVid || getVisitorId();
    inflight.current = true;

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "verify-attach-anonymous",
          { body: { run_id: runId, visitor_id: visitorId } },
        );
        if (error) throw new Error(error.message || "Rattachement impossible");
        if (!data?.report_id) throw new Error(data?.error || "Rapport introuvable");

        clearLastRun();
        // Strip resume params before redirecting so refresh is idempotent.
        if (paramRunId || paramVid) {
          const next = new URLSearchParams(sp);
          next.delete("resume");
          next.delete("vid");
          setSp(next, { replace: true });
        }
        navigate(`/proprietaire/verifications/${data.report_id}`, {
          replace: true,
        });
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Impossible d'ouvrir votre rapport",
        );
        inflight.current = false;
      }
    })();
  }, [isLoading, session?.user, sp, setSp, navigate]);
}
