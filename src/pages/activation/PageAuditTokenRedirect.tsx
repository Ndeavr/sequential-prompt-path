/**
 * UNPRO — /unpro/audit/:token
 *
 * First-touch SMS destination: curiosity → personalized free AI score.
 * Resolves the outreach activation token (records the click through the
 * canonical resolver, preserving prospect / ai_agent / campaign / affiliate
 * attribution), then hands off to the personalized Audit IA experience with
 * the prospect pre-selected. Never renders a generic landing page.
 */
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PageAuditTokenRedirect() {
  const { token } = useParams<{ token: string }>();
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setFailed(true);
        return;
      }
      try {
        // Plain resolve = canonical click tracking (clicked_at / click_count +
        // engagement event) exactly like the activation landing.
        const { data } = await supabase.functions.invoke("activation-token-resolve", {
          body: { token },
        });
        if (cancelled) return;
        const prospectId = (data as any)?.prospect?.id ?? (data as any)?.prospect_id ?? null;
        const businessName =
          (data as any)?.prospect?.business_name ?? (data as any)?.business_name ?? null;
        if (!prospectId && !businessName) {
          setFailed(true);
          return;
        }
        const params = new URLSearchParams();
        if (prospectId) params.set("p", String(prospectId));
        if (businessName) params.set("q", String(businessName));
        params.set("at", token);
        // Preserve / forward campaign attribution.
        params.set("utm_source", sp.get("utm_source") ?? "sms");
        params.set("utm_medium", sp.get("utm_medium") ?? "outreach");
        params.set("utm_campaign", sp.get("utm_campaign") ?? "ai_score_first_touch");
        const ref = sp.get("ref");
        if (ref) params.set("ref", ref);
        navigate(`/entrepreneurs/audit-ia?${params.toString()}`, { replace: true });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, navigate, sp]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background text-foreground">
      <Helmet>
        <title>Votre score IA — UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {failed ? (
          <span>Ce lien n'est plus valide.</span>
        ) : (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            <span>Analyse en cours…</span>
          </>
        )}
      </div>
    </div>
  );
}
