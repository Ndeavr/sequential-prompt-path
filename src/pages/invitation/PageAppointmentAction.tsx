/**
 * /rdv/:token — contractor answers an appointment request from a unique link.
 */
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Summary = {
  action: "accept" | "propose" | "decline";
  business_name: string | null;
  project: string;
  preferred_date: string | null;
  time_window: string | null;
  response: string | null;
};

const DONE: Record<string, string> = {
  accepted: "Rendez-vous accepté. Le propriétaire est avisé.",
  proposed: "Vos plages ont été envoyées au propriétaire.",
  declined: "Demande refusée. Merci de votre réponse rapide.",
};

export default function PageAppointmentAction() {
  const { token } = useParams<{ token: string }>();
  const [s, setS] = useState<Summary | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "done" | "sending">("loading");
  const [err, setErr] = useState("");
  const [slots, setSlots] = useState([{ date: "", window: "" }, { date: "", window: "" }]);
  const [reason, setReason] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.functions.invoke("contractor-appointment-action", {
        body: { token, op: "view", prefetch: document.visibilityState === "hidden" },
      });
      if (error || !data?.ok) {
        setErr(data?.error === "expired" ? "Ce lien a expiré." : "Ce lien n'est pas valide.");
        setState("error");
        return;
      }
      setS(data);
      setState(data.response ? "done" : "ready");
    })();
  }, [token]);

  const respond = async () => {
    setState("sending");
    const { data } = await supabase.functions.invoke("contractor-appointment-action", {
      body: { token, op: "respond", slots: slots.filter((x) => x.date), reason },
    });
    if (data?.ok || data?.error === "already_responded") {
      setS((p) => (p ? { ...p, response: data.response } : p));
      setState("done");
    } else {
      setErr(data?.error === "slots_required" ? "Ajoutez au moins une date." : "Réponse non enregistrée. Réessayez.");
      setState("ready");
    }
  };

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md space-y-5">
        <p className="text-sm font-bold tracking-tight">UNPRO</p>
        {state === "loading" && <p className="text-muted-foreground">Chargement de la demande…</p>}
        {state === "error" && <p className="text-lg font-semibold">{err}</p>}
        {s && state !== "error" && (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">Demande de rendez-vous</h1>
            <div className="rounded-2xl border border-border bg-card p-4 space-y-1 text-sm">
              <p><b>Projet :</b> {s.project}</p>
              {s.preferred_date && <p><b>Date souhaitée :</b> {s.preferred_date}</p>}
              {s.time_window && <p><b>Plage :</b> {s.time_window}</p>}
            </div>
            {state === "done" ? (
              <p className="text-base font-medium">{DONE[s.response ?? ""] ?? "Réponse déjà enregistrée."}</p>
            ) : (
              <div className="space-y-3">
                {s.action === "propose" &&
                  slots.map((sl, i) => (
                    <div key={i} className="flex gap-2">
                      <input type="date" value={sl.date} className="flex-1 rounded-xl border border-input bg-background px-3 py-2"
                        onChange={(e) => setSlots((a) => a.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} />
                      <select value={sl.window} className="rounded-xl border border-input bg-background px-3 py-2"
                        onChange={(e) => setSlots((a) => a.map((x, j) => (j === i ? { ...x, window: e.target.value } : x)))}>
                        <option value="">Plage</option><option>Matin</option><option>Après-midi</option><option>Soir</option>
                      </select>
                    </div>
                  ))}
                {s.action === "decline" && (
                  <textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300}
                    placeholder="Raison (facultatif)" className="w-full rounded-xl border border-input bg-background px-3 py-2" />
                )}
                {err && <p className="text-sm text-destructive">{err}</p>}
                <Button className="w-full" size="lg" disabled={state === "sending"} onClick={respond}
                  variant={s.action === "decline" ? "outline" : "default"}>
                  {s.action === "accept" ? "Confirmer l'acceptation" : s.action === "propose" ? "Envoyer mes plages" : "Confirmer le refus"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
