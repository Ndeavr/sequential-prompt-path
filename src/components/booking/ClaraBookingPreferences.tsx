/**
 * ClaraBookingPreferences — the contractor tells Clara, by text or voice, how
 * they like their appointments. Clara recaps what she understood, asks one
 * missing question at a time, and saves the result as DECLARED preferences
 * (contractor_booking_rules). Nothing is verified or assumed.
 */
import { useCallback, useEffect, useState } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import CalendarIntegrationRequest from "@/components/calendar/CalendarIntegrationRequest";
import { useAlexVoiceInput } from "@/hooks/useAlexVoiceInput";
import { request as requestPermission } from "@/lib/permissionManager";
import {
  applyHoursToAvailability,
  parseBookingPreferences,
  summarizeBookingPreferences,
  type AvailabilityRow,
  type ParsedBookingPreferences,
} from "@/services/clara/claraBookingPreferences";

interface Props {
  contractorId: string;
  availability: AvailabilityRow[];
  onApplyHours: (rows: AvailabilityRow[]) => void;
}

type Step = "describe" | "recap" | "reps" | "reps_split" | "travel" | "saving";

export default function ClaraBookingPreferences({ contractorId, availability, onApplyHours }: Props) {
  const [text, setText] = useState("");
  const [step, setStep] = useState<Step>("describe");
  const [parsed, setParsed] = useState<ParsedBookingPreferences | null>(null);
  const [reps, setReps] = useState("");
  const [repsNote, setRepsNote] = useState("");
  const [saved, setSaved] = useState<string | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [known, setKnown] = useState<{ reps: number | null; travel: number | null }>({ reps: null, travel: null });
  const [pending, setPending] = useState<{ reps: number | null; note: string | null }>({ reps: null, note: null });
  const [travel, setTravel] = useState("");

  const onTranscript = useCallback((t: string, isFinal: boolean) => {
    if (isFinal && t) setText((prev) => (prev ? `${prev} ${t}` : t));
  }, []);
  const voice = useAlexVoiceInput({ language: "fr-CA", onTranscript, silenceTimeoutMs: 2500 });

  useEffect(() => {
    let live = true;
    supabase
      .from("contractor_booking_rules")
      .select("preference_summary, declared_representatives, max_travel_minutes")
      .eq("contractor_id", contractorId)
      .maybeSingle()
      .then(({ data }) => {
        if (!live || !data) return;
        if (data.preference_summary) setSaved(data.preference_summary);
        setKnown({ reps: data.declared_representatives ?? null, travel: data.max_travel_minutes ?? null });
      });
    return () => { live = false; };
  }, [contractorId]);

  useEffect(() => {
    if (voice.permissionDenied) setVoiceNote("Le micro n'est pas accessible. Vous pouvez simplement écrire.");
  }, [voice.permissionDenied]);

  const toggleMic = async () => {
    if (voice.isListening) { voice.stopListening(); return; }
    const status = await requestPermission("mic");
    if (status !== "granted") {
      setVoiceNote("Le micro n'est pas accessible. Vous pouvez simplement écrire.");
      return;
    }
    setVoiceNote(null);
    voice.startListening();
  };

  const recap = () => {
    voice.stopListening();
    setParsed(parseBookingPreferences(text));
    setStep("recap");
  };

  const lines = parsed ? summarizeBookingPreferences({ ...parsed, representatives: reps ? Number(reps) : parsed.representatives }) : [];

  const save = async (finalReps: number | null, note: string | null, travelMinutes: number | null) => {
    if (!parsed) return;
    setStep("saving");
    const summary = summarizeBookingPreferences({ ...parsed, representatives: finalReps, maxTravelMinutes: travelMinutes ?? known.travel }).join(" · ");
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("contractor_booking_rules").upsert(
      {
        contractor_id: contractorId,
        // Only what was explicitly said this time replaces an earlier declaration.
        ...(parsed.maxEveningsPerWeek !== null ? { max_evenings_per_week: parsed.maxEveningsPerWeek } : {}),
        ...(parsed.preferCompactSchedule ? { prefer_compact_schedule: true } : {}),
        ...(finalReps !== null ? { declared_representatives: finalReps } : {}),
        ...(note ? { representatives_note: note } : {}),
        // Declared only when stated; never a default travel time.
        ...(travelMinutes !== null ? { max_travel_minutes: travelMinutes } : {}),
        visit_capacity: 1,
        preference_text: text.slice(0, 2000),
        preference_summary: summary.slice(0, 2000),
        declared_by: auth.user?.id ?? null,
        declared_at: new Date().toISOString(),
      },
      { onConflict: "contractor_id" },
    );
    if (error) {
      toast.error("Clara n'a pas pu enregistrer vos préférences. Réessayez.");
      setStep("recap");
      return;
    }
    if (Object.keys(parsed.hours).length) {
      onApplyHours(applyHoursToAvailability(availability, parsed.hours));
      toast.success("Préférences enregistrées. Vérifiez vos horaires ci-dessous puis sauvegardez.");
    } else {
      toast.success("Préférences enregistrées.");
    }
    setSaved(summary);
    setKnown((k) => ({ reps: finalReps ?? k.reps, travel: travelMinutes ?? k.travel }));
    setText(""); setParsed(null); setReps(""); setRepsNote(""); setTravel("");
    setStep("describe");
  };

  // Representatives settled → ask travel once (only if never declared), else save.
  const afterReps = (finalReps: number | null, note: string | null) => {
    if (!parsed) return;
    if (parsed.maxTravelMinutes === null && known.travel === null) {
      setPending({ reps: finalReps, note });
      setStep("travel");
      return;
    }
    void save(finalReps, note, parsed.maxTravelMinutes);
  };

  const confirmRecap = () => {
    if (!parsed) return;
    const r = parsed.representatives ?? known.reps;
    if (r === null) { setStep("reps"); return; }
    if (parsed.representatives !== null && parsed.representatives > 1) { setStep("reps_split"); return; }
    afterReps(r, null);
  };

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-section text-foreground">Décrivez à Clara comment vous préférez vos rendez-vous</h2>
      </div>

      {saved && step === "describe" && (
        <p className="text-meta text-muted-foreground">Préférences déclarées : {saved}</p>
      )}

      {step === "describe" && (
        <>
          <div className="relative">
            <Textarea
              value={voice.isListening && voice.liveTranscript ? `${text} ${voice.liveTranscript}`.trim() : text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ex. : visites de 11 h à 21 h en semaine, sauf vendredi 16 h; max 3 soirs par semaine; maximum 30 minutes de déplacement entre visites."
              rows={3}
              maxLength={2000}
              className="pr-12 text-base"
            />
            {voice.isSupported && (
              <Button
                type="button"
                size="icon"
                variant={voice.isListening ? "default" : "ghost"}
                onClick={toggleMic}
                className="absolute right-2 top-2 h-11 w-11"
                aria-label={voice.isListening ? "Arrêter la dictée" : "Dicter à Clara"}
              >
                {voice.isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            )}
          </div>
          {voiceNote && <p className="text-meta text-muted-foreground">{voiceNote}</p>}
          <Button onClick={recap} disabled={text.trim().length < 4} className="h-11">
            Clara, résumez
          </Button>
        </>
      )}

      {step === "recap" && parsed && (
        <div className="space-y-3">
          {lines.length ? (
            <>
              <p className="text-body text-foreground">Voici ce que j'ai compris :</p>
              <ul className="list-disc pl-5 text-body text-foreground space-y-1">
                {lines.map((l) => <li key={l}>{l}</li>)}
              </ul>
              <div className="flex flex-wrap gap-2">
                <Button onClick={confirmRecap} className="h-11">C'est exact</Button>
                <Button variant="outline" onClick={() => setStep("describe")} className="h-11">Corriger</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-body text-foreground">Je n'ai pas bien saisi. Pouvez-vous préciser vos jours et vos heures?</p>
              <Button variant="outline" onClick={() => setStep("describe")} className="h-11">Préciser</Button>
            </>
          )}
        </div>
      )}

      {step === "reps" && (
        <div className="space-y-3">
          <p className="text-body text-foreground">Combien de représentants peuvent effectuer des visites simultanément?</p>
          <Input type="number" inputMode="numeric" min={1} max={50} value={reps} onChange={(e) => setReps(e.target.value)} className="w-28 h-11 text-base" />
          <Button
            className="h-11"
            disabled={!(Number(reps) >= 1 && Number(reps) <= 50)}
            onClick={() => (Number(reps) > 1 ? setStep("reps_split") : afterReps(1, null))}
          >
            Continuer
          </Button>
        </div>
      )}

      {step === "reps_split" && (
        <div className="space-y-3">
          <p className="text-body text-foreground">
            Comment souhaitez-vous répartir les agendas et les disponibilités entre vos représentants?
          </p>
          <Textarea value={repsNote} onChange={(e) => setRepsNote(e.target.value)} rows={2} maxLength={1000} className="text-base" />
          <p className="text-meta text-muted-foreground">
            En attendant que chaque représentant ait son agenda, une seule visite à la fois est proposée.
          </p>
          <Button
            className="h-11"
            disabled={repsNote.trim().length < 3}
            onClick={() => afterReps(Number(reps) || parsed?.representatives || null, repsNote.trim())}
          >
            Enregistrer
          </Button>
        </div>
      )}

      {step === "travel" && (
        <div className="space-y-3">
          <p className="text-body text-foreground">Quel est votre temps de déplacement maximal entre deux rendez-vous?</p>
          <div className="flex items-center gap-2">
            <Input
              type="number" inputMode="numeric" min={5} max={240} value={travel}
              onChange={(e) => setTravel(e.target.value)} className="w-28 h-11 text-base" aria-label="Minutes de déplacement maximal"
            />
            <span className="text-body text-foreground">minutes</span>
          </div>
          <p className="text-meta text-muted-foreground">
            Clara compare seulement aux trajets réellement calculés. Sans trajet calculé, le créneau reste proposé et marqué « trajet non vérifié ».
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="h-11" disabled={!(Number(travel) >= 5 && Number(travel) <= 240)} onClick={() => void save(pending.reps, pending.note, Number(travel))}>
              Continuer
            </Button>
            <Button variant="outline" className="h-11" onClick={() => void save(pending.reps, pending.note, null)}>
              Pas de limite précisée
            </Button>
          </div>
        </div>
      )}

      {step === "saving" && <p className="text-meta text-muted-foreground">Enregistrement…</p>}

      {step === "describe" && <CalendarIntegrationRequest surface="booking_settings" />}
    </section>
  );
}
