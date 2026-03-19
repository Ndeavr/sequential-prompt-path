import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Star } from "lucide-react";

interface AppointmentFeedbackFormProps {
  appointmentId: string;
  onDone?: () => void;
}

const AppointmentFeedbackForm = ({ appointmentId, onDone }: AppointmentFeedbackFormProps) => {
  const [rating, setRating] = useState(5);
  const [wasOnTime, setWasOnTime] = useState(true);
  const [wasProfessional, setWasProfessional] = useState(true);
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("submit-appointment-feedback", {
      body: { appointmentId, rating, wasOnTime, wasProfessional, wouldRecommend, comment: comment || undefined },
    });

    if (error || !data?.ok) {
      toast.error(error?.message || data?.error || "Erreur lors de l'envoi.");
      setSaving(false);
      return;
    }

    toast.success("Merci ! Votre avis a été enregistré.");
    setSaving(false);
    onDone?.();
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Évaluer ce rendez-vous</h3>

      <div className="space-y-2">
        <Label>Note globale</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((v) => (
            <button key={v} onClick={() => setRating(v)} className="p-1 transition hover:scale-110">
              <Star className={`h-6 w-6 ${v <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={wasOnTime} onCheckedChange={(v) => setWasOnTime(!!v)} />
          Était à l'heure
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={wasProfessional} onCheckedChange={(v) => setWasProfessional(!!v)} />
          Professionnel et courtois
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={wouldRecommend} onCheckedChange={(v) => setWouldRecommend(!!v)} />
          Je recommanderais cet entrepreneur
        </label>
      </div>

      <div className="space-y-2">
        <Label>Commentaire (optionnel)</Label>
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Décrivez votre expérience..." rows={3} />
      </div>

      <Button onClick={handleSubmit} disabled={saving} className="w-full">
        {saving ? "Envoi..." : "Envoyer mon avis"}
      </Button>
    </div>
  );
};

export default AppointmentFeedbackForm;
