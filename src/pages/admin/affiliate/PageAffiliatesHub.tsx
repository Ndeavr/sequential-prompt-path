/**
 * UNPRO — Admin Affiliates Hub (Sprint A shell)
 * Route: /admin/affiliates
 * 10 onglets. Dashboard + Affiliés + Assignations sont fonctionnels.
 * Les autres sont des placeholders explicites "à venir" pour éviter les liens morts.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Users, UserPlus, DollarSign, TrendingUp, Award, FileText, Settings,
  ClipboardList, Wallet, Send,
} from "lucide-react";

type Aff = {
  id: string;
  name: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  primary_city: string | null;
  province: string | null;
  status: string;
  commission_pct: number | null;
  daily_quota: number | null;
  total_assigned: number;
  total_contacted: number;
  total_trials: number;
  total_converted: number;
  total_revenue_cents: number;
  total_commissions_cents: number;
  referral_code: string;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  training: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  suspended: "bg-red-500/10 text-red-500 border-red-500/30",
  inactive: "bg-muted text-muted-foreground border-border/40",
  admin: "bg-primary/10 text-primary border-primary/30",
};

function formatCents(cents: number) {
  return `${(cents / 100).toLocaleString("fr-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} $`;
}

function KpiCard({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Icon className="w-4 h-4 text-primary" /></div>
          <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-semibold tabular-nums">{value}</div>
            {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardTab({ affiliates }: { affiliates: Aff[] }) {
  const activeCount = affiliates.filter((a) => a.status === "active").length;
  const totalAssigned = affiliates.reduce((s, a) => s + (a.total_assigned || 0), 0);
  const totalTrials = affiliates.reduce((s, a) => s + (a.total_trials || 0), 0);
  const totalConverted = affiliates.reduce((s, a) => s + (a.total_converted || 0), 0);
  const totalRevenue = affiliates.reduce((s, a) => s + (a.total_revenue_cents || 0), 0);
  const totalCommissions = affiliates.reduce((s, a) => s + (a.total_commissions_cents || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <KpiCard icon={Users} label="Affiliés actifs" value={String(activeCount)} hint={`${affiliates.length} au total`} />
      <KpiCard icon={ClipboardList} label="Prospects assignés" value={String(totalAssigned)} />
      <KpiCard icon={Send} label="Essais 1 $" value={String(totalTrials)} />
      <KpiCard icon={TrendingUp} label="Conversions" value={String(totalConverted)} />
      <KpiCard icon={DollarSign} label="Revenus générés" value={formatCents(totalRevenue)} />
      <KpiCard icon={Wallet} label="Commissions dues" value={formatCents(totalCommissions)} />
    </div>
  );
}

function AddAffiliateDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [commissionPct, setCommissionPct] = useState("20");
  const [dailyQuota, setDailyQuota] = useState("25");
  const [saving, setSaving] = useState(false);

  const reset = () => { setFirstName(""); setLastName(""); setEmail(""); setPhone(""); setCity(""); setCommissionPct("20"); setDailyQuota("25"); };

  const submit = async () => {
    if (!firstName.trim() || !email.trim()) {
      toast.error("Prénom et courriel requis");
      return;
    }
    setSaving(true);
    try {
      const name = [firstName, lastName].filter(Boolean).join(" ").trim();
      // Referral code: FIRST + 4 random uppercase chars
      const code = `${firstName.slice(0, 4).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
      const { error } = await (supabase as any).from("affiliates").insert({
        name,
        first_name: firstName.trim(),
        last_name: lastName.trim() || null,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        primary_city: city.trim() || null,
        province: "QC",
        status: "active",
        commission_pct: Number(commissionPct) || 20,
        daily_quota: Number(dailyQuota) || 25,
        referral_code: code,
      });
      if (error) throw error;
      toast.success(`Affilié ${name} créé (code ${code})`);
      reset();
      onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un affilié</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Prénom *</Label>
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Nom</Label>
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-1 col-span-2">
            <Label>Courriel *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15145551234" />
          </div>
          <div className="space-y-1">
            <Label>Ville</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Commission %</Label>
            <Input type="number" value={commissionPct} onChange={(e) => setCommissionPct(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Quota quotidien</Label>
            <Input type="number" value={dailyQuota} onChange={(e) => setDailyQuota(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Création…" : "Créer l'affilié"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AffiliatesTab({ affiliates, refetch }: { affiliates: Aff[]; refetch: () => void }) {
  const [search, setSearch] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const rows = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return affiliates;
    return affiliates.filter((a) =>
      [a.name, a.first_name, a.last_name, a.email, a.primary_city].filter(Boolean).some((v) => String(v).toLowerCase().includes(s)),
    );
  }, [affiliates, search]);

  const qc = useQueryClient();
  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any).from("affiliates").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Statut mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-affiliates-hub"] });
      refetch();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Input placeholder="Rechercher (nom, ville, courriel)…" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex-1" />
        <Button onClick={() => setOpenAdd(true)} className="gap-2"><UserPlus className="w-4 h-4" /> Ajouter affilié</Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun affilié. Cliquez sur « Ajouter affilié » pour commencer.
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/40">
              <tr>
                <th className="p-3 text-left font-medium">Nom</th>
                <th className="p-3 text-left font-medium">Ville</th>
                <th className="p-3 text-left font-medium">Téléphone</th>
                <th className="p-3 text-left font-medium">Prospects</th>
                <th className="p-3 text-left font-medium">Essais</th>
                <th className="p-3 text-left font-medium">Conv.</th>
                <th className="p-3 text-left font-medium">Revenus</th>
                <th className="p-3 text-left font-medium">Comm.</th>
                <th className="p-3 text-left font-medium">Code</th>
                <th className="p-3 text-left font-medium">Statut</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const display = [a.first_name, a.last_name].filter(Boolean).join(" ").trim() || a.name;
                return (
                  <tr key={a.id} className="border-b border-border/20 hover:bg-muted/10">
                    <td className="p-3 font-medium">
                      <div>{display}</div>
                      <div className="text-xs text-muted-foreground">{a.email ?? "—"}</div>
                    </td>
                    <td className="p-3 text-muted-foreground">{a.primary_city ?? "—"}</td>
                    <td className="p-3 font-mono text-xs">{a.phone ?? "—"}</td>
                    <td className="p-3 tabular-nums">{a.total_assigned}</td>
                    <td className="p-3 tabular-nums">{a.total_trials}</td>
                    <td className="p-3 tabular-nums">{a.total_converted}</td>
                    <td className="p-3 tabular-nums">{formatCents(a.total_revenue_cents)}</td>
                    <td className="p-3 tabular-nums">{formatCents(a.total_commissions_cents)}</td>
                    <td className="p-3 font-mono text-xs">{a.referral_code}</td>
                    <td className="p-3">
                      <Badge variant="outline" className={STATUS_TONE[a.status] ?? STATUS_TONE.inactive}>{a.status}</Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1">
                        {a.status !== "active" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "active" })}>Activer</Button>
                        )}
                        {a.status === "active" && (
                          <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ id: a.id, status: "suspended" })}>Suspendre</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AddAffiliateDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={refetch} />
    </div>
  );
}

function ApplicationsTab() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["affiliate-applications"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliate_applications")
        .select("id, first_name, last_name, email, phone, city, experience, status, submitted_at")
        .order("submitted_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const review = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { error } = await (supabase as any).from("affiliate_applications")
        .update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidature traitée");
      qc.invalidateQueries({ queryKey: ["affiliate-applications"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Erreur"),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-6">Chargement…</div>;
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">
        Aucune candidature reçue. Le formulaire public sera activé au Sprint D.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 border-b border-border/40">
          <tr>
            <th className="p-3 text-left">Candidat</th>
            <th className="p-3 text-left">Contact</th>
            <th className="p-3 text-left">Ville</th>
            <th className="p-3 text-left">Statut</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c: any) => (
            <tr key={c.id} className="border-b border-border/20">
              <td className="p-3 font-medium">{[c.first_name, c.last_name].filter(Boolean).join(" ")}</td>
              <td className="p-3 text-xs">{c.email}<br/>{c.phone}</td>
              <td className="p-3">{c.city ?? "—"}</td>
              <td className="p-3"><Badge variant="outline">{c.status}</Badge></td>
              <td className="p-3">
                {c.status === "pending" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => review.mutate({ id: c.id, status: "approved" })}>Approuver</Button>
                    <Button size="sm" variant="outline" onClick={() => review.mutate({ id: c.id, status: "rejected" })}>Refuser</Button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommissionsTab() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-commissions"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("commissions")
        .select("id, affiliate_id, plan, sale_cents, commission_cents, status, created_at, affiliates(name)")
        .order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-6">Chargement…</div>;
  const totals = {
    pending: data.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + c.commission_cents, 0),
    approved: data.filter((c: any) => c.status === "approved").reduce((s: number, c: any) => s + c.commission_cents, 0),
    paid: data.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + c.commission_cents, 0),
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard icon={Wallet} label="En attente" value={formatCents(totals.pending)} />
        <KpiCard icon={Wallet} label="Approuvées" value={formatCents(totals.approved)} />
        <KpiCard icon={Wallet} label="Payées" value={formatCents(totals.paid)} />
      </div>
      {data.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card p-8 text-center text-sm text-muted-foreground">
          Aucune commission enregistrée. Le calcul automatique arrivera au Sprint C.
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/40">
              <tr><th className="p-3 text-left">Affilié</th><th className="p-3 text-left">Plan</th><th className="p-3 text-left">Vente</th><th className="p-3 text-left">Commission</th><th className="p-3 text-left">Statut</th></tr>
            </thead>
            <tbody>
              {data.map((c: any) => (
                <tr key={c.id} className="border-b border-border/20">
                  <td className="p-3">{c.affiliates?.name ?? "—"}</td>
                  <td className="p-3">{c.plan ?? "—"}</td>
                  <td className="p-3 tabular-nums">{formatCents(c.sale_cents)}</td>
                  <td className="p-3 tabular-nums font-semibold">{formatCents(c.commission_cents)}</td>
                  <td className="p-3"><Badge variant="outline">{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ComingSoon({ title, subtitle, sprint }: { title: string; subtitle: string; sprint: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card p-8 text-center space-y-2">
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <Badge variant="outline" className="mt-2">Livré au {sprint}</Badge>
    </div>
  );
}

export default function PageAffiliatesHub() {
  const [tab, setTab] = useState("dashboard");

  const q = useQuery({
    queryKey: ["admin-affiliates-hub"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliates")
        .select("id, name, first_name, last_name, email, phone, primary_city, province, status, commission_pct, daily_quota, total_assigned, total_contacted, total_trials, total_converted, total_revenue_cents, total_commissions_cents, referral_code, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Aff[];
    },
  });

  const affiliates = q.data ?? [];

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10"><Users className="h-6 w-6 text-primary" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">Programme Affiliés</h1>
            <p className="text-sm text-muted-foreground">Cockpit central de recrutement, assignation et paiement des affiliés UNPRO.</p>
          </div>
          <Link to="/admin/affiliates/assign">
            <Button variant="outline" className="gap-2"><ClipboardList className="w-4 h-4" /> Assignation groupée</Button>
          </Link>
        </header>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid grid-cols-5 lg:grid-cols-10 h-auto">
            <TabsTrigger value="dashboard" className="text-xs"><TrendingUp className="w-3.5 h-3.5 mr-1" />Dashboard</TabsTrigger>
            <TabsTrigger value="affiliates" className="text-xs"><Users className="w-3.5 h-3.5 mr-1" />Affiliés</TabsTrigger>
            <TabsTrigger value="prospects" className="text-xs"><ClipboardList className="w-3.5 h-3.5 mr-1" />Prospects</TabsTrigger>
            <TabsTrigger value="assignments" className="text-xs"><UserPlus className="w-3.5 h-3.5 mr-1" />Assignations</TabsTrigger>
            <TabsTrigger value="applications" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Candidat.</TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs"><DollarSign className="w-3.5 h-3.5 mr-1" />Comm.</TabsTrigger>
            <TabsTrigger value="payouts" className="text-xs"><Wallet className="w-3.5 h-3.5 mr-1" />Paiements</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-xs"><Award className="w-3.5 h-3.5 mr-1" />Leaderboard</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs"><FileText className="w-3.5 h-3.5 mr-1" />Docs</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs"><Settings className="w-3.5 h-3.5 mr-1" />Réglages</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="dashboard">
              {q.isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : <DashboardTab affiliates={affiliates} />}
            </TabsContent>
            <TabsContent value="affiliates">
              {q.isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : <AffiliatesTab affiliates={affiliates} refetch={() => q.refetch()} />}
            </TabsContent>
            <TabsContent value="prospects">
              <div className="rounded-2xl border border-border/40 bg-card p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Utilisez l'outil dédié.</p>
                <Link to="/admin/affiliates/assign"><Button>Ouvrir l'assignation groupée</Button></Link>
              </div>
            </TabsContent>
            <TabsContent value="assignments">
              <div className="rounded-2xl border border-border/40 bg-card p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Assignation manuelle disponible dès maintenant.</p>
                <Link to="/admin/affiliates/assign"><Button>Ouvrir l'assignation groupée</Button></Link>
                <p className="text-xs text-muted-foreground">Règles automatiques (ville → catégorie → affilié) : Sprint D.</p>
              </div>
            </TabsContent>
            <TabsContent value="applications"><ApplicationsTab /></TabsContent>
            <TabsContent value="commissions"><CommissionsTab /></TabsContent>
            <TabsContent value="payouts"><ComingSoon title="Paiements" subtitle="Lots de paiement, exports CSV / Stripe / QuickBooks." sprint="Sprint C" /></TabsContent>
            <TabsContent value="leaderboard"><ComingSoon title="Leaderboard" subtitle="Classement par conversions, revenus et commissions." sprint="Sprint D" /></TabsContent>
            <TabsContent value="documents"><ComingSoon title="Documents" subtitle="Bibliothèque PDF (scripts appel/SMS, présentation, FAQ)." sprint="Sprint D" /></TabsContent>
            <TabsContent value="settings"><ComingSoon title="Réglages" subtitle="Règles d'assignation, quotas globaux, seuils de charge." sprint="Sprint D" /></TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
