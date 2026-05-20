import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PageGoShortLink() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("short-link-resolve", {
          body: {},
          method: "GET",
          headers: {},
        } as any).catch(() => ({ data: null, error: { message: "fallback" } } as any));

        let target: string | null = data?.target ?? null;
        if (!target) {
          // Direct fetch fallback with query param
          const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
          const url = `https://${projectId}.supabase.co/functions/v1/short-link-resolve?slug=${encodeURIComponent(slug)}`;
          const r = await fetch(url, { method: "GET" });
          if (r.ok) {
            const j = await r.json();
            target = j.target ?? null;
          }
        }

        if (!alive) return;

        if (target) {
          navigate(target, { replace: true });
        } else {
          // Fallback: try /pro/:slug directly
          navigate(`/pro/${slug}`, { replace: true });
        }
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? "Lien introuvable");
      }
    })();
    return () => { alive = false; };
  }, [slug, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center space-y-3">
        <div className="h-10 w-10 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-sm text-muted-foreground">Préparation de votre aperçu…</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
