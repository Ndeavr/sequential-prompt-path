import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Calendar, Zap, Timer } from "lucide-react";
import { toast } from "sonner";

const DAYS = [
  { key: "mon", label: "Lun" },
  { key: "tue", label: "Mar" },
  { key: "wed", label: "Mer" },
  { key: "thu", label: "Jeu" },
  { key: "fri", label: "Ven" },
  { key: "sat", label: "Sam" },
  { key: "sun", label: "Dim" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00`, label: `${h}:00` };
});

const TIMEZONES = [
  { value: "America/Montreal", label: "Montréal (EST)" },
  { value: "America/Toronto", label: "Toronto (EST)" },
  { value: "America/Vancouver", label: "Vancouver (PST)" },
  { value: "America/Edmonton", label: "Edmonton (MST)" },
  { value: "UTC", label: "UTC" },
];

interface Props {
  campaign: any;
  onUpdate: () => void;
}

export default function PanelCampaignScheduling({ campaign, onUpdate }: Props) {
  const [autoSend, setAutoSend] = useState(campaign.auto_send_enabled || false);
  const [windowStart, setWindowStart] = useState(campaign.send_window_start || "09:00");
  const [windowEnd, setWindowEnd] = useState(campaign.send_window_end || "17:00");
  const [timezone, setTimezone] = useState(campaign.send_timezone || "America/Montreal");
  const [sendDays, setSendDays] = useState<string[]>(campaign.send_days || ["mon", "tue", "wed", "thu", "fri"]);
  const [saving, setSaving] = useState(false);

  const toggleDay = (day: string) => {
    setSendDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("outbound_campaigns")
      .update({
        auto_send_enabled: autoSend,
        send_window_start: windowStart,
        send_window_end: windowEnd,
        send_timezone: timezone,
        send_days: sendDays,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", campaign.id);

    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Scheduling mis à jour");
    onUpdate();
  };

  return (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="h-4 w-4 text-primary" />
            Envoi automatique
          </CardTitle>
          <Switch checked={autoSend} onCheckedChange={setAutoSend} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Send Window */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Fenêtre d'envoi
          </label>
          <div className="flex items-center gap-2">
            <Select value={windowStart} onValueChange={setWindowStart}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOURS.map(h => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">à</span>
            <Select value={windowEnd} onValueChange={setWindowEnd}>
              <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {HOURS.map(h => (
                  <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Fuseau horaire</label>
          <Select value={timezone} onValueChange={setTimezone}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TIMEZONES.map(tz => (
                <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Send Days */}
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" /> Jours d'envoi
          </label>
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map(d => (
              <Badge
                key={d.key}
                variant="outline"
                className={`cursor-pointer text-[10px] px-2 py-0.5 transition-colors ${
                  sendDays.includes(d.key)
                    ? "bg-primary/20 text-primary border-primary/40"
                    : "bg-muted/30 text-muted-foreground"
                }`}
                onClick={() => toggleDay(d.key)}
              >
                {d.label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 pt-1">
          <Zap className={`h-3.5 w-3.5 ${autoSend ? "text-emerald-400" : "text-muted-foreground"}`} />
          <span className="text-xs">
            {autoSend
              ? `Actif · ${windowStart}–${windowEnd} · ${sendDays.length} jours/sem`
              : "Envoi manuel uniquement"}
          </span>
        </div>

        <Button size="sm" className="w-full" onClick={save} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer le scheduling"}
        </Button>
      </CardContent>
    </Card>
  );
}
