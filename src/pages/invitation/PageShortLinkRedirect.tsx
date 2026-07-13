/**
 * PageShortLinkRedirect — /r/:token
 * Resolves the short-link token via edge function, redirects to /invitation/:landing_token.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PageShortLinkRedirect() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Lien invalide.");
      return;
    }
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("outreach-shortlink-resolve", {
          body: { token },
        });
        if (fnErr || !data?.landing_token) {
          setError("Ce lien n'est plus valide.");
          return;
        }
        navigate(`/invitation/${data.landing_token}`, { replace: true });
      } catch {
        setError("Ce lien n'est plus valide.");
      }
    })();
  }, [token, navigate]);

  return (
    <main className="min-h-screen bg-[#050816] text-white flex items-center justify-center px-6">
      {error ? (
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold mb-2">Lien expiré</h1>
          <p className="text-white/70">{error}</p>
        </div>
      ) : (
        <p className="text-white/70">Redirection…</p>
      )}
    </main>
  );
}
