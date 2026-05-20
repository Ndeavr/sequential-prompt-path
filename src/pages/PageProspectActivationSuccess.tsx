import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PageActivationSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "ok" | "error">("verifying");
  const [email, setEmail] = useState<string | null>(null);
  const [magic, setMagic] = useState<string | null>(null);

  useEffect(() => {
    const session_id = params.get("session_id");
    const slug = params.get("slug");
    if (!session_id) { setStatus("error"); return; }

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("activation-confirm", {
          body: { session_id, slug },
        });
        if (error || !data?.ok) { setStatus("error"); return; }
        setEmail(data.email ?? null);
        setMagic(data.magic_link ?? null);
        setStatus("ok");
      } catch {
        setStatus("error");
      }
    })();
  }, [params]);

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {status === "verifying" && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <h1 className="text-2xl font-semibold">Activation en cours…</h1>
            <p className="text-sm text-muted-foreground">Nous préparons votre tableau de bord UNPRO.</p>
          </>
        )}
        {status === "ok" && (
          <>
            <div className="text-5xl">⚡</div>
            <h1 className="text-3xl font-semibold">Visibilité IA activée</h1>
            <p className="text-base text-muted-foreground">
              {email
                ? <>Un lien d'accès a été envoyé à <span className="text-foreground font-medium">{email}</span>.</>
                : <>Votre accès est prêt.</>}
            </p>
            {magic ? (
              <a href={magic} className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium">
                Ouvrir mon tableau de bord
              </a>
            ) : (
              <button
                onClick={() => navigate("/dashboard")}
                className="inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-6 py-3 font-medium"
              >
                Aller au tableau de bord
              </button>
            )}
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-2xl font-semibold">Vérification impossible</h1>
            <p className="text-sm text-muted-foreground">Si vous avez été débité, contactez-nous — votre activation sera honorée.</p>
            <button onClick={() => navigate("/")} className="text-sm underline">Retour à l'accueil</button>
          </>
        )}
      </div>
    </div>
  );
}
