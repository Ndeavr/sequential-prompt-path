/**
 * QrRedirectPage — /r/:shortCode
 * Resolves a short_code from qr_user_links, logs a qr_scans row, sets attribution, then redirects.
 */
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function QrRedirectPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!shortCode) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      try {
        const { data: link } = await supabase
          .from("qr_user_links")
          .select("id, destination_url, is_active, intent_slug, variant, user_id")
          .eq("short_code", shortCode)
          .maybeSingle();

        if (!link || !link.is_active || !link.destination_url || link.destination_url === "pending") {
          navigate("/", { replace: true });
          return;
        }

        // Fire-and-forget log
        supabase.from("qr_scans").insert({
          link_id: link.id,
          intent_slug: link.intent_slug,
          variant: link.variant ?? null,
          user_agent: navigator.userAgent.substring(0, 200),
          source: "qr",
          medium: "mobile_share",
        } as any).then(() => {}, () => {});

        try {
          localStorage.setItem("qr_referrer_code", shortCode);
          localStorage.setItem("qr_code_id", link.id);
          localStorage.setItem("qr_source", "qr");
          if (link.user_id) localStorage.setItem("qr_referrer_user_id", link.user_id);
        } catch {}

        const dest = link.destination_url;
        if (/^https?:\/\//i.test(dest)) {
          window.location.replace(dest);
        } else {
          navigate(dest, { replace: true });
        }
      } catch {
        navigate("/", { replace: true });
      }
    })();
  }, [shortCode, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Redirection…
    </div>
  );
}
