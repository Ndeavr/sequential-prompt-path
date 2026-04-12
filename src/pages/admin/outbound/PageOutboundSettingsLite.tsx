import AdminLayout from "@/layouts/AdminLayout";
import { Settings, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function PageOutboundSettingsLite() {
  const [dryRunDefault, setDryRunDefault] = useState(true);
  const [testMailbox, setTestMailbox] = useState("test@unpro.ca");
  const [sendLimit, setSendLimit] = useState("10");
  const [healthSnapshots, setHealthSnapshots] = useState(true);
  const [criticalWarnings, setCriticalWarnings] = useState(true);
  const [jobFrequency, setJobFrequency] = useState("60");

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-primary/10"><Settings className="h-5 w-5 text-primary" /></div>
        <div>
          <h1 className="text-lg font-bold font-display">Paramètres rapides</h1>
          <p className="text-xs text-muted-foreground">Paramètres opérationnels essentiels</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /><CardTitle className="text-sm">Sécurité</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label className="text-sm">Dry-run par défaut</Label><p className="text-xs text-muted-foreground">Aucun envoi live sans action explicite</p></div>
              <Switch checked={dryRunDefault} onCheckedChange={setDryRunDefault} />
            </div>
            <div className="flex items-center justify-between">
              <div><Label className="text-sm">Warnings critiques</Label><p className="text-xs text-muted-foreground">Afficher les alertes critiques</p></div>
              <Switch checked={criticalWarnings} onCheckedChange={setCriticalWarnings} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Email test</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Mailbox test par défaut</Label>
              <Input value={testMailbox} onChange={e => setTestMailbox(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Limite d'envoi test (par session)</Label>
              <Input type="number" value={sendLimit} onChange={e => setSendLimit(e.target.value)} className="h-8 text-sm" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Snapshots santé</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div><Label className="text-sm">Activer les snapshots</Label><p className="text-xs text-muted-foreground">Capture quotidienne de l'état pipeline</p></div>
              <Switch checked={healthSnapshots} onCheckedChange={setHealthSnapshots} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Jobs automation</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Fréquence par défaut (minutes)</Label>
              <Input type="number" value={jobFrequency} onChange={e => setJobFrequency(e.target.value)} className="h-8 text-sm" />
            </div>
          </CardContent>
        </Card>
      </div>

      {dryRunDefault && (
        <div className="border border-emerald-500/30 bg-emerald-500/5 rounded-lg p-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-emerald-400" />
          <div>
            <p className="text-sm font-medium text-emerald-400">Mode sécurisé actif</p>
            <p className="text-xs text-muted-foreground">Dry-run activé par défaut. Aucun email live ne sera envoyé depuis les tests.</p>
          </div>
        </div>
      )}
    </div>
  );
}
