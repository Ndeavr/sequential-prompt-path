/**
 * UNPRO — Book Appointment Card
 * Contractor books appointment after accepting a lead.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CalendarPlus, Loader2, CheckCircle2 } from "lucide-react";

const TIME_WINDOWS = [
  { value: "morning", label: "Matin (8h–12h)" },
  { value: "afternoon", label: "Après-midi (12h–17h)" },
  { value: "evening", label: "Soir (17h–20h)" },
];

interface Props {
  matchId: string;
  responseStatus?: string | null;
  projectCategory?: string | null;
  onBooked?: () => void;
}

export default function BookAppointmentCard({ matchId, responseStatus, projectCategory, onBooked }: Props) {
  const [preferredDate, setPreferredDate] = useState("");
  const [timeWindow, setTimeWindow] = useState("morning");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [booked, setBooked] = useState(false);

  if (responseStatus !== "accepted") return null;
  if (booked) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-xs font-medium text-emerald-400">Rendez-vous créé avec succès</span>
      </div>
    );
  }

  async function handleBook() {
    if (!preferredDate) {
      toast.error("Veuillez choisir une date");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-appointment-from-match", {
        body: {
          matchId,
          preferredDate,
          preferredTimeWindow: timeWindow,
          projectCategory: projectCategory ?? undefined,
          notes: notes || undefined,
        },
      });

      if (error || !data?.ok) {
        throw new Error(error?.message || data?.error || "Erreur");
      }

      toast.success("Rendez-vous créé !");
      setBooked(true);
      onBooked?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur inattendue";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-border/30 bg-background/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarPlus className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Planifier un rendez-vous</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Date souhaitée</Label>
          <Input
            type="date"
            value={preferredDate}
            onChange={(e) => setPreferredDate(e.target.value)}
            className="text-xs rounded-xl h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Plage horaire</Label>
          <select
            value={timeWindow}
            onChange={(e) => setTimeWindow(e.target.value)}
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TIME_WINDOWS.map((tw) => (
              <option key={tw.value} value={tw.value}>
                {tw.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Notes (optionnel)</Label>
        <Textarea
          placeholder="Informations supplémentaires…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[50px] text-xs rounded-xl"
        />
      </div>

      <Button
        size="sm"
        className="w-full text-xs rounded-xl"
        disabled={saving || !preferredDate}
        onClick={handleBook}
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <CalendarPlus className="h-3.5 w-3.5 mr-1" />
        )}
        {saving ? "Création…" : "Confirmer le rendez-vous"}
      </Button>
    </div>
  );
}
