import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity, Users, Mail, MailOpen, MousePointerClick, MessageSquareReply,
  Calendar, CreditCard, TrendingUp, Sparkles, Target, Trophy,
} from "lucide-react";
import {
  useAcquisitionMetrics, useAcquisitionTopCities, useAcquisitionTopCategories,
} from "@/hooks/useAcquisitionMachine";

const fmt = (n: number) => new Intl.NumberFormat("fr-CA").format(n);
const money = (cents: number) => new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);

interface KPIProps {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}
function KPI({ icon: Icon, label, value, hint, accent = "text-primary" }: KPIProps) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Icon className={`h-4 w-4 ${accent}`} />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
          </div>
          <p className="text-2xl font-black text-foreground">{value}</p>
          {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function PageAcquisitionCockpit() {
  const { data: m, isLoading } = useAcquisitionMetrics();
  const { data: cities } = useAcquisitionTopCities();
  const { data: cats } = useAcquisitionTopCategories();

  const openRate = m && m.emails_sent_today > 0 ? Math.round((m.emails_opened_today / m.emails_sent_today) * 100) : 0;
  const clickRate = m && m.emails_sent_today > 0 ? Math.round((m.emails_clicked_today / m.emails_sent_today) * 100) : 0;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <Badge variant="outline" className="mb-2 text-[10px]">
            <Activity className="h-3 w-3 mr-1" /> Live · Acquisition Machine
          </Badge>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight">
            Cockpit Acquisition <span className="text-primary">100 contractors</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Métriques temps réel · pipeline · revenus · alerte agents
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/acquisition/kanban"><Badge className="cursor-pointer hover:bg-primary/90">Kanban CRM →</Badge></Link>
          <Link to="/admin/outbound"><Badge variant="outline" className="cursor-pointer">Outbound</Badge></Link>
          <Link to="/admin/outbound/ops"><Badge variant="outline" className="cursor-pointer">Ops Center</Badge></Link>
          <Link to="/admin/operations"><Badge variant="outline" className="cursor-pointer">Operations Hub</Badge></Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <KPI icon={Users} label="Leads totaux" value={isLoading ? "…" : fmt(m?.leads_total ?? 0)} hint={`+${m?.leads_today ?? 0} aujourd'hui`} accent="text-cyan-400" />
        <KPI icon={Mail} label="Emails envoyés" value={fmt(m?.emails_sent_today ?? 0)} hint="aujourd'hui" accent="text-blue-400" />
        <KPI icon={MailOpen} label="Taux ouverture" value={`${openRate}%`} hint={`${fmt(m?.emails_opened_today ?? 0)} ouverts`} accent="text-violet-400" />
        <KPI icon={MousePointerClick} label="Taux clic" value={`${clickRate}%`} hint={`${fmt(m?.emails_clicked_today ?? 0)} clics`} accent="text-fuchsia-400" />
        <KPI icon={MessageSquareReply} label="Réponses" value={fmt(m?.replies_today ?? 0)} hint="aujourd'hui" accent="text-amber-400" />
        <KPI icon={Calendar} label="RDV réservés" value={fmt(m?.bookings_today ?? 0)} hint="aujourd'hui" accent="text-orange-400" />
        <KPI icon={CreditCard} label="Paiements" value={fmt(m?.payments_today ?? 0)} hint={money(m?.revenue_today_cents ?? 0)} accent="text-emerald-400" />
        <KPI icon={TrendingUp} label="MRR" value={money(m?.mrr_cents ?? 0)} hint="actif cumulé" accent="text-emerald-400" />
        <KPI icon={Trophy} label="Gagnés" value={fmt(m?.funnel.won ?? 0)} hint="contractors payants" accent="text-yellow-400" />
        <KPI icon={Target} label="En séquence" value={fmt(m?.funnel.in_sequence ?? 0)} hint="emails actifs" accent="text-indigo-400" />
      </div>

      {/* Funnel */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Funnel d'acquisition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {(
              [
                ["Nouveau", m?.funnel.new, "from-slate-500 to-slate-600"],
                ["Enrichi", m?.funnel.enriched, "from-blue-500 to-blue-600"],
                ["Scoré", m?.funnel.scored, "from-cyan-500 to-cyan-600"],
                ["En séquence", m?.funnel.in_sequence, "from-violet-500 to-violet-600"],
                ["Réponse", m?.funnel.replied, "from-amber-500 to-amber-600"],
                ["Booké", m?.funnel.booked, "from-orange-500 to-orange-600"],
                ["Gagné", m?.funnel.won, "from-emerald-500 to-emerald-600"],
                ["Perdu", m?.funnel.lost, "from-red-500 to-red-600"],
              ] as const
            ).map(([label, value, grad]) => (
              <div key={label} className={`rounded-lg bg-gradient-to-br ${grad} p-3 text-white`}>
                <p className="text-[10px] uppercase opacity-80">{label}</p>
                <p className="text-2xl font-black">{fmt((value ?? 0) as number)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top cities + top categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top villes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(cities ?? []).map((c) => (
              <div key={c.city} className="flex items-center justify-between p-2 rounded bg-background/50 hover:bg-background transition-colors">
                <span className="font-medium text-sm">{c.city}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-muted-foreground">{c.leads} leads</span>
                  <span className="text-orange-400">{c.bookings} RDV</span>
                  <span className="text-emerald-400">{c.conversions} payés</span>
                </div>
              </div>
            ))}
            {!cities?.length && <p className="text-xs text-muted-foreground py-4 text-center">Aucune donnée</p>}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-3"><CardTitle className="text-sm">Top spécialités</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(cats ?? []).map((c) => (
              <div key={c.specialty} className="flex items-center justify-between p-2 rounded bg-background/50 hover:bg-background transition-colors">
                <span className="font-medium text-sm capitalize">{c.specialty}</span>
                <div className="flex gap-3 text-xs">
                  <span className="text-muted-foreground">{c.leads} leads</span>
                  <span className="text-orange-400">{c.bookings} RDV</span>
                  <span className="text-emerald-400">{c.conversions} payés</span>
                </div>
              </div>
            ))}
            {!cats?.length && <p className="text-xs text-muted-foreground py-4 text-center">Aucune donnée</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
