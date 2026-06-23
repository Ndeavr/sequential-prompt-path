import { useEffect } from "react";
import { useParams } from "react-router-dom";

/**
 * UNPRO — Click tracking redirect page.
 * Forwards the visitor to the r-redirect edge function which logs a `clicked`
 * event and 302s to the destination URL. Renders a tiny loading state.
 */
export default function PageRedirect() {
  const { trackingId } = useParams<{ trackingId: string }>();

  useEffect(() => {
    if (!trackingId) {
      window.location.replace("https://unpro.ca");
      return;
    }
    const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID || "";
    const url = projectRef
      ? `https://${projectRef}.functions.supabase.co/r-redirect/${encodeURIComponent(trackingId)}`
      : `https://unpro.ca`;
    window.location.replace(url);
  }, [trackingId]);

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#050816", color: "rgba(255,255,255,0.7)", fontFamily: "Inter, sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.6 }}>Un instant…</div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.4 }}>Redirection sécurisée UNPRO</div>
      </div>
    </div>
  );
}
