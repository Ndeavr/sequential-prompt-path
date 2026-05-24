import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Rocket, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Channel = "email" | "sms" | "both";

export function SniperCycleRunner() {
  const { toast } = useToast();
  const [running, setRunning] = useState(false);
  const [channel, setChannel] = useState<Channel>("both");
  const [overrideEmail, setOverrideEmail] = useState("");
  const [overridePhone, setOverridePhone] = useState("");
  const [dryRun, setDryRun] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function runOnce(ch: "email" | "sms") {
    const { data, error } = await supabase.functions.invoke("run-outbound-smoke", {
      body: {
        limit: 1,
        channel: ch,
        overrideEmail: ch === "email" && overrideEmail ? overrideEmail : null,
        overridePhone: ch === "sms" && overridePhone ? overridePhone : null,
        dryRun,
      },
    });
    if (error) throw error;
    return data;
  }

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const out: any = { runs: [] };
      if (channel === "email" || channel === "both") {
        out.runs.push({ channel: "email", ...(await runOnce("email")) });
      }
      if (channel === "sms" || channel === "both") {
        out.runs.push({ channel: "sms", ...(await runOnce("sms")) });
      }
      setResult(out);
      toast({ title: dryRun ? "Cycle simulé" : "Cycle lancé", description: "Voir trace ci-dessous." });
    } catch (e: any) {
      toast({ title: "Échec du cycle", description: e?.message ?? "Erreur inconnue", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" /> Lancer cycle complet
          <Badge variant="outline" className="ml-2 text-[10px]">scrape→enrich→assets→envoi</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Canal</Label>
            <div className="flex gap-1">
              {(["email", "sms", "both"] as Channel[]).map((c) => (
                <Button key={c} size="sm" variant={channel === c ? "default" : "outline"} onClick={() => setChannel(c)} className="flex-1 text-xs h-8">
                  {c === "both" ? "Les 2" : c.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Override email (test)</Label>
            <Input value={overrideEmail} onChange={(e) => setOverrideEmail(e.target.value)} placeholder="vous@domaine.com" className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Override téléphone (test)</Label>
            <Input value={overridePhone} onChange={(e) => setOverridePhone(e.target.value)} placeholder="+15145551234" className="h-8 text-xs" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch checked={dryRun} onCheckedChange={setDryRun} id="dryrun" />
            <Label htmlFor="dryrun" className="text-xs">Dry-run (n'envoie rien)</Label>
          </div>
          <Button onClick={run} disabled={running} size="sm">
            {running ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Rocket className="w-3 h-3 mr-2" />}
            {running ? "En cours…" : "Lancer"}
          </Button>
        </div>

        {result && (
          <div className="mt-2 space-y-2">
            {result.runs.map((r: any, i: number) => (
              <div key={i} className="rounded-md border bg-muted/30 p-2">
                <div className="text-xs font-medium mb-1">
                  Canal {r.channel} · {r.ok ? <span className="text-primary">OK</span> : <span className="text-destructive">{r.error}</span>}
                </div>
                {r.queue?.length > 0 && (
                  <ul className="text-[11px] space-y-0.5">
                    {r.queue.map((q: any, j: number) => (
                      <li key={j} className="flex justify-between gap-2">
                        <span className="truncate">{q.channel} → {q.destination}</span>
                        <span className={q.send_status === "sent" ? "text-primary" : "text-muted-foreground"}>{q.send_status}{q.error_message ? ` · ${q.error_message.slice(0, 60)}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
