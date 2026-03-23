import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MailX, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type Status = "loading" | "valid" | "already" | "invalid" | "success" | "error";

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }

    const validate = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`;
        const res = await fetch(url, { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } });
        const data = await res.json();
        if (!res.ok) { setStatus("invalid"); return; }
        if (data.valid === false && data.reason === "already_unsubscribed") { setStatus("already"); return; }
        setStatus("valid");
      } catch { setStatus("invalid"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    setStatus("loading");
    try {
      const { error } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      setStatus(error ? "error" : "success");
    } catch { setStatus("error"); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-lg">
        {status === "loading" && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Chargement…</p>
          </>
        )}
        {status === "valid" && (
          <>
            <MailX className="mx-auto h-12 w-12 text-primary" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Se désabonner</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous ne recevrez plus d'emails de notre part.
            </p>
            <button
              onClick={handleUnsubscribe}
              className="mt-6 w-full rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90"
            >
              Confirmer le désabonnement
            </button>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-success" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Désabonné</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous avez été retiré de notre liste d'envoi.
            </p>
          </>
        )}
        {status === "already" && (
          <>
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Déjà désabonné</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Vous êtes déjà retiré de notre liste.
            </p>
          </>
        )}
        {(status === "invalid" || status === "error") && (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <h1 className="mt-4 text-xl font-bold text-foreground">Lien invalide</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ce lien de désabonnement est invalide ou a expiré.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
