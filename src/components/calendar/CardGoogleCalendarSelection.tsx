/** Choose the exact writable Google calendar for each owned contractor.
 * No automatic Google OAuth, no personal-primary fallback, no event access here.
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { CalendarDays, RefreshCw } from "lucide-react";

type Contractor = { id: string; business_name: string; slug: string | null };
type CalendarItem = { id: string; name: string; writable: boolean; primary: boolean };
type ResponseBody = {
  connected?: boolean; calendars?: CalendarItem[]; selected_id?: string | null;
  selection_status?: string; error?: string; reason?: string;
};

const BACKEND = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-google-selection`;
const errorLabel: Record<string, string> = {
  no_unpro_google_connection: "Aucun compte Google autorisé dans UNPRO. Choisissez d'abord « Connecter Google Calendar » dans UNPRO, uniquement si vous le souhaitez.",
  google_connection_revoked: "UNPRO n'a plus accès à ce compte Google. Le choix d'agenda est indisponible.",
  calendar_read_only: "Cet agenda ne permet pas de créer des rendez-vous. Choisissez un agenda où vous avez le droit de modifier les événements.",
  calendar_not_in_google_account: "Cet agenda n'est pas accessible dans le compte relié. Actualisez la liste.",
  calendar_selection_save_failed: "Impossible d'enregistrer votre choix.",
  calendar_cache_clear_failed: "Choix enregistré, mais le cache n'a pas pu être réinitialisé. Aucun nouvel horaire ne doit être publié.",
};

export default function CardGoogleCalendarSelection() {
  const { user } = useAuth();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorId, setContractorId] = useState("");
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [calendarId, setCalendarId] = useState("");
  const [connected, setConnected] = useState(false);
  const [selectionStatus, setSelectionStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void supabase.from("contractors").select("id,business_name,slug")
      .eq("user_id", user.id).order("business_name")
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) { setMessage("Impossible de retrouver votre entreprise."); return; }
        const owned = (data ?? []) as Contractor[];
        setContractors(owned);
        // No silent selection when the account controls more than one company.
        setContractorId((prior) => owned.some(c => c.id === prior) ? prior : owned.length === 1 ? owned[0].id : "");
      });
    return () => { alive = false; };
  }, [user]);

  const load = useCallback(async () => {
    if (!contractorId) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Veuillez ouvrir votre session UNPRO.");
      const response = await fetch(`${BACKEND}?contractor_id=${encodeURIComponent(contractorId)}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const body = await response.json() as ResponseBody;
      if (!response.ok) throw new Error(errorLabel[body.error ?? ""] || "Calendriers indisponibles pour le moment.");
      setConnected(body.connected === true);
      setCalendars(body.calendars ?? []);
      setCalendarId(body.selected_id ?? "");
      setSelectionStatus(body.selection_status ?? "");
      if (!body.connected) setMessage(errorLabel.no_unpro_google_connection);
    } catch (e) {
      setCalendars([]);
      setConnected(false);
      setCalendarId("");
      setMessage(e instanceof Error ? e.message : "Impossible de charger les calendriers.");
    } finally { setBusy(false); }
  }, [contractorId]);

  useEffect(() => {
    setCalendars([]); setCalendarId(""); setSelectionStatus("");
    void load();
  }, [load]);

  const save = async () => {
    if (!contractorId || !calendarId || busy) return;
    setBusy(true); setMessage("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Connexion à UNPRO requise.");
      const response = await fetch(BACKEND, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ contractor_id: contractorId, calendar_id: calendarId }),
      });
      const body = await response.json() as ResponseBody;
      if (!response.ok) throw new Error(errorLabel[body.error ?? ""] || "Sélection impossible.");
      const { data: sync, error: syncError } = await supabase.functions.invoke("calendar-freebusy-sync", { body: { days: 45 } });
      const synced = !syncError && (sync?.results ?? []).some((r: { provider?: string; status?: string }) =>
        r.provider === "google" && r.status === "success");
      setSelectionStatus(synced ? "connected" : "pending_sync");
      setMessage(synced
        ? "Calendrier sélectionné. Les périodes occupées ont été synchronisées."
        : "Choix enregistré. La synchronisation n'est pas encore confirmée; aucun créneau ne doit être considéré comme disponible.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Sélection impossible.");
    } finally { setBusy(false); }
  };

  return (
    <section className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5 space-y-4" aria-labelledby="google-calendar-chooser-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="google-calendar-chooser-title" className="flex items-center gap-2 font-semibold text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" /> Choisir mon calendrier Google
        </h3>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()} disabled={!contractorId || busy}
          aria-label="Actualiser les calendriers">
          <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Sélectionnez le calendrier professionnel où UNPRO pourra inscrire les rendez-vous confirmés.
        Aucun calendrier personnel n'est sélectionné automatiquement.
      </p>
      {contractors.length > 1 && (
        <div>
          <label htmlFor="google-calendar-contractor" className="block text-sm font-medium mb-1">Entreprise</label>
          <select id="google-calendar-contractor" value={contractorId} onChange={e => setContractorId(e.target.value)}
            className="w-full min-h-11 rounded-lg border border-input bg-background px-3 text-foreground">
            <option value="">Choisir une entreprise</option>
            {contractors.map(c => <option key={c.id} value={c.id}>{c.business_name}</option>)}
          </select>
        </div>
      )}
      {contractors.length === 0 && <p className="text-sm text-muted-foreground">Aucune entreprise associée à ce compte.</p>}
      {connected && (
        <>
          <div>
            <label htmlFor="google-calendar-choice" className="block text-sm font-medium mb-1">Calendrier à partager avec UNPRO</label>
            <select id="google-calendar-choice" value={calendarId} onChange={e => setCalendarId(e.target.value)}
              disabled={busy} className="w-full min-h-11 rounded-lg border border-input bg-background px-3 text-foreground">
              <option value="">Choisir un calendrier…</option>
              {calendars.map(c => (
                <option key={c.id} value={c.id} disabled={!c.writable}>
                  {c.name}{c.primary ? " (principal)" : ""}{c.writable ? "" : " — lecture seule"}
                </option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={() => void save()} disabled={busy || !calendarId || !calendars.find(c => c.id === calendarId)?.writable}
            className="w-full min-h-11">
            {busy ? "Vérification…" : "Enregistrer ce calendrier"}
          </Button>
          {selectionStatus === "connected" && <p className="text-sm text-emerald-600">Calendrier sélectionné et synchronisé.</p>}
        </>
      )}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </section>
  );
}
