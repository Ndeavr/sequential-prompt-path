import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Server, Shield, RotateCcw, TrendingUp, Plus, AlertTriangle } from "lucide-react";
import { useSendingDomains, useSendingMailboxes } from "@/hooks/useOutboundEliteData";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DOMAIN_STRATEGY = [
  { domain: "go.unpro.ca", purpose: "Primary outbound", risk: "Isolé" },
  { domain: "contact.unpro.ca", purpose: "Warmup & testing", risk: "Isolé" },
  { domain: "get.unpro.ca", purpose: "Scale overflow", risk: "Isolé" },
  { domain: "pro.unpro.ca", purpose: "Premium prospects", risk: "Isolé" },
];

function WarmupBadge({ stage }: { stage: string }) {
  const variant = stage === "warm" ? "default" : stage === "warming" ? "secondary" : "outline";
  return <Badge variant={variant}>{stage}</Badge>;
}

function HealthBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600";
  return <span className={`font-bold ${color}`}>{score}/100</span>;
}

export default function PageOutboundSendingArchitecture() {
  const { data: domains, isLoading: domainsLoading } = useSendingDomains();
  const { data: mailboxes, isLoading: mailboxesLoading } = useSendingMailboxes();

  return (
    <AdminLayout>
      <div className="space-y-6">
      {/* Hero */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Server className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Sending Architecture</h1>
          <p className="text-sm text-muted-foreground">Domaines, mailboxes, warmup & rotation</p>
        </div>
      </div>

      {/* Domain Strategy */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Domain Strategy</CardTitle>
          </div>
          <CardDescription>Ne jamais envoyer depuis le domaine principal — isoler le risque</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {DOMAIN_STRATEGY.map((d) => (
              <div key={d.domain} className="p-3 rounded-lg border bg-card">
                <p className="font-mono text-sm font-medium">{d.domain}</p>
                <p className="text-xs text-muted-foreground mt-1">{d.purpose}</p>
                <Badge variant="outline" className="mt-2 text-xs">{d.risk}</Badge>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-destructive">Ne jamais utiliser <strong>unpro.ca</strong> directement pour l'outbound. Risque de blacklist du domaine principal.</p>
          </div>
        </CardContent>
      </Card>

      {/* Domains Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Domaines d'envoi</CardTitle>
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          {domainsLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
          ) : !domains?.length ? (
            <p className="text-sm text-muted-foreground">Aucun domaine configuré.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domaine</TableHead>
                  <TableHead>SPF</TableHead>
                  <TableHead>DKIM</TableHead>
                  <TableHead>DMARC</TableHead>
                  <TableHead>Warmup</TableHead>
                  <TableHead>Santé</TableHead>
                  <TableHead>Cap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-sm">{d.domain}</TableCell>
                    <TableCell>{d.spf_valid ? "✅" : "❌"}</TableCell>
                    <TableCell>{d.dkim_valid ? "✅" : "❌"}</TableCell>
                    <TableCell>{d.dmarc_valid ? "✅" : "❌"}</TableCell>
                    <TableCell><WarmupBadge stage={d.warmup_stage} /></TableCell>
                    <TableCell><HealthBadge score={d.health_score} /></TableCell>
                    <TableCell className="text-sm">{d.current_daily_sent}/{d.daily_cap}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Mailboxes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Mailboxes & Rotation</CardTitle>
          </div>
          <Button size="sm" variant="outline"><Plus className="h-4 w-4 mr-1" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          {mailboxesLoading ? (
            <p className="text-sm text-muted-foreground animate-pulse">Chargement…</p>
          ) : !mailboxes?.length ? (
            <p className="text-sm text-muted-foreground">Aucune mailbox configurée.</p>
          ) : (
            <div className="space-y-2">
              {mailboxes.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">{m.email_address}</p>
                    <p className="text-xs text-muted-foreground">{m.display_name} · Jour {m.warmup_day} · Poids {m.rotation_weight}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{m.current_daily_sent}/{m.daily_cap}</span>
                    <Badge variant={m.is_active ? "default" : "secondary"}>{m.is_active ? "Actif" : "Inactif"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warmup Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Warmup Rules</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: "Jour 1-3", value: "10/jour" },
              { label: "Jour 4-7", value: "25/jour" },
              { label: "Jour 8-14", value: "50/jour" },
              { label: "Jour 15+", value: "100/jour" },
            ].map((r) => (
              <div key={r.label} className="p-3 rounded-lg bg-muted/50 text-center">
                <div className="font-bold text-primary">{r.value}</div>
                <div className="text-xs text-muted-foreground">{r.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              <strong>Sécurité :</strong> Envoi bloqué si SPF/DKIM/DMARC invalide ou bounce rate &gt; 5%
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </AdminLayout>
  );
}
