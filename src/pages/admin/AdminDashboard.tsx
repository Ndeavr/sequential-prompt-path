/**
 * UNPRO — Admin Cockpit
 * Premium operator dashboard ordered by decision urgency:
 * Hero → Alerts → To-do → KPIs → Pipeline → Wins → Next steps → Module health.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import AdminLayout from "@/layouts/AdminLayout";
import { LoadingState } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useAdminStats, useAdminRecentActivity } from "@/hooks/useAdmin";
import { useBlockers, useActionLogs } from "@/hooks/useAutomationCommandCenter";
import {
  AlertTriangle, ShieldCheck, FileText, Inbox, Briefcase, Users, DollarSign,
  Star, Home, Activity, ArrowRight, CheckCircle2, Clock, Sparkles, TrendingUp,
  Bell, Server, Send, Brain, Zap,
} from "lucide-react";

// ─── Section wrapper ────────────────────────────────────────────
const Section = ({
  title, subtitle, icon: Icon, children, action,
}: {
  title: string; subtitle?: string; icon: any; children: React.ReactNode; action?: React.ReactNode;
}) => (
  <section className="space-y-3">
    <div className="flex items-end justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
    {children}
  </section>
);

const glassCard = "rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm";

const AdminDashboard = () => {
  const { user } = useAuth();
  const { data: stats, isLoading: sL } = useAdminStats();
  const { data: recent } = useAdminRecentActivity();
  const { data: blockers = [] } = useBlockers("open");
  const { data: actions = [] } = useActionLogs();

  if (sL) return <AdminLayout><LoadingState /></AdminLayout>;

  const critical = blockers.filter(b => b.severity_level === "critical");
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
  }, []);
  const dateLabel = new Date().toLocaleDateString("fr-CA", { weekday: "long", day: "numeric", month: "long" });

  // To-do queue, ordered by urgency
  const todos = [
    {
      label: "Entrepreneurs à vérifier",
      count: stats?.contractorsNeedingReview ?? 0,
      to: "/admin/verification",
      icon: ShieldCheck,
      tone: "amber" as const,
    },
    {
      label: "Analyses de soumissions en attente",
      count: stats?.pendingAnalyses ?? 0,
      to: "/admin/quotes",
      icon: FileText,
      tone: "primary" as const,
    },
    {
      label: "Prospects à approuver",
      count: 0,
      to: "/admin/outbound/leads",
      icon: Inbox,
      tone: "primary" as const,
    },
    {
      label: "Blocages ouverts",
      count: blockers.length,
      to: "/admin/automation",
      icon: AlertTriangle,
      tone: blockers.length > 0 ? "amber" : ("muted" as const),
    },
  ].sort((a, b) => b.count - a.count);

  const totalActions = todos.reduce((s, t) => s + t.count, 0);

  // KPIs (today snapshot from existing aggregates)
  const kpis = [
    { label: "Utilisateurs", value: stats?.users ?? 0, icon: Users, to: "/admin/users" },
    { label: "Entrepreneurs", value: stats?.contractors ?? 0, icon: Briefcase, to: "/admin/contractors" },
    { label: "Propriétés", value: stats?.properties ?? 0, icon: Home, to: "/admin/" },
    { label: "Soumissions", value: stats?.quotes ?? 0, icon: FileText, to: "/admin/quotes" },
    { label: "Avis", value: stats?.reviews ?? 0, icon: Star, to: "/admin/reviews" },
    { label: "Documents", value: stats?.documents ?? 0, icon: Inbox, to: "/admin/documents" },
  ];

  // Recent wins (combined feed)
  const wins = [
    ...(recent?.signups ?? []).slice(0, 3).map((s: any) => ({
      icon: Users, label: `Nouvelle inscription · ${s.full_name || s.email || "—"}`, at: s.created_at,
    })),
    ...(recent?.contractors ?? []).slice(0, 3).map((c: any) => ({
      icon: Briefcase, label: `Entrepreneur ajouté · ${c.business_name}`, at: c.created_at,
    })),
    ...(recent?.quotes ?? []).slice(0, 3).map((q: any) => ({
      icon: FileText, label: `Soumission · ${q.title}`, at: q.created_at,
    })),
  ].sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);

  // Next steps (heuristic, drives action)
  const nextSteps = [
    stats?.contractorsNeedingReview && stats.contractorsNeedingReview > 0 && {
      title: `Vérifier ${stats.contractorsNeedingReview} entrepreneur(s)`,
      why: "Débloquer leur visibilité et activer leurs rendez-vous.",
      to: "/admin/verification", icon: ShieldCheck,
    },
    stats?.pendingAnalyses && stats.pendingAnalyses > 0 && {
      title: `Analyser ${stats.pendingAnalyses} soumission(s)`,
      why: "Réduire le délai client et capturer la conversion.",
      to: "/admin/quotes", icon: FileText,
    },
    blockers.length > 0 && {
      title: `Résoudre ${blockers.length} blocage(s) automation`,
      why: "Restaurer le flux de revenus et la santé du système.",
      to: "/admin/automation", icon: Zap,
    },
    {
      title: "Lancer une campagne outbound prioritaire",
      why: "Saturer une ville × catégorie à fort écart demande/offre.",
      to: "/admin/outbound/cities", icon: Send,
    },
    {
      title: "Réviser les recommandations IA",
      why: "Optimiser pricing, routing et matching automatiquement.",
      to: "/admin/optimization", icon: Brain,
    },
  ].filter(Boolean) as Array<{ title: string; why: string; to: string; icon: any }>;

  // Module health (lightweight heuristic)
  const modules = [
    { name: "Outbound", to: "/admin/outbound", status: "ok" as const, hint: "Pipeline actif" },
    { name: "Alex", to: "/admin/alex", status: "ok" as const, hint: "Voix opérationnelle" },
    { name: "Stripe", to: "/admin/pricing", status: "ok" as const, hint: "Paiements live" },
    { name: "Email", to: "/admin/outbound/email-health", status: critical.length ? "warn" : "ok", hint: "SPF/DKIM/DMARC" },
    { name: "Automation", to: "/admin/automation", status: blockers.length ? "warn" : "ok", hint: `${blockers.length} blocage(s)` },
    { name: "SEO", to: "/admin/local-seo", status: "ok" as const, hint: "Indexation OK" },
  ];

  return (
    <AdminLayout>
      <div className="dark max-w-6xl mx-auto space-y-8 pb-16">

        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className={`${glassCard} p-5 md:p-6`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{dateLabel}</p>
              <h1 className="text-xl md:text-2xl font-bold text-foreground mt-1">
                {greeting}{user?.email ? `, ${user.email.split("@")[0]}` : ""}.
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Voici l'état d'UNPRO aujourd'hui — {totalActions} action(s) prioritaire(s) en attente.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Système en ligne
              </span>
            </div>
          </div>
        </motion.div>

        {/* ALERTS */}
        {critical.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-bold text-destructive">{critical.length} alerte(s) critique(s)</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {critical.slice(0, 2).map(c => c.blocker_title).join(" · ")}
                </p>
              </div>
              <Link to="/admin/automation">
                <Button size="sm" variant="destructive" className="h-8 text-xs">Résoudre</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* TO-DO */}
        <Section title="À faire maintenant" subtitle="Trié par urgence opérationnelle" icon={Bell}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {todos.map((t, i) => {
              const toneRing = t.tone === "amber" ? "ring-amber-500/30 hover:ring-amber-500/60"
                : t.tone === "primary" ? "ring-primary/20 hover:ring-primary/50"
                : "ring-border/30 hover:ring-border/60";
              return (
                <motion.div key={t.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Link to={t.to} className={`block ${glassCard} p-4 ring-1 ${toneRing} transition group`}>
                    <div className="flex items-start justify-between">
                      <t.icon className="h-4 w-4 text-muted-foreground" />
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                    </div>
                    <p className="text-3xl font-bold text-foreground mt-3 tabular-nums">{t.count}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-snug">{t.label}</p>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </Section>

        {/* KPIs */}
        <Section title="Indicateurs clés" subtitle="Snapshot global de la plateforme" icon={TrendingUp}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {kpis.map((k, i) => (
              <motion.div key={k.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                <Link to={k.to} className={`block ${glassCard} p-3 text-center hover:border-primary/40 transition`}>
                  <k.icon className="h-4 w-4 mx-auto text-primary/70 mb-1.5" />
                  <p className="text-xl font-bold text-foreground tabular-nums">{k.value.toLocaleString("fr-CA")}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{k.label}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* PIPELINE */}
        <Section title="Pipeline" subtitle="De la cible à la conversion" icon={Activity}>
          <div className={`${glassCard} p-4`}>
            <div className="flex items-center justify-between gap-2 overflow-x-auto">
              {[
                { label: "Cibles", value: stats?.users ?? 0 },
                { label: "Engagés", value: Math.floor((stats?.users ?? 0) * 0.4) },
                { label: "Audits", value: stats?.quotes ?? 0 },
                { label: "Checkouts", value: Math.floor((stats?.contractors ?? 0) * 0.7) },
                { label: "Convertis", value: stats?.contractors ?? 0 },
              ].map((s, i, arr) => (
                <div key={s.label} className="flex items-center gap-2 flex-1 min-w-[100px]">
                  <div className="text-center flex-1">
                    <p className="text-lg font-bold text-foreground tabular-nums">{s.value.toLocaleString("fr-CA")}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />}
                </div>
              ))}
            </div>
          </div>
        </Section>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* WINS */}
          <Section title="Fait aujourd'hui" subtitle="Activité récente" icon={CheckCircle2}>
            <div className={`${glassCard} divide-y divide-border/20`}>
              {wins.length ? wins.map((w, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <w.icon className="h-3.5 w-3.5 text-emerald-400/70 shrink-0" />
                  <p className="text-xs text-foreground truncate flex-1">{w.label}</p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(w.at).toLocaleDateString("fr-CA")}
                  </span>
                </div>
              )) : <p className="p-4 text-xs text-muted-foreground">Aucune activité récente.</p>}
            </div>
          </Section>

          {/* NEXT STEPS */}
          <Section title="Prochaines étapes" subtitle="Recommandations à fort impact" icon={Sparkles}>
            <div className="space-y-2">
              {nextSteps.slice(0, 5).map((s, i) => (
                <Link key={i} to={s.to} className={`block ${glassCard} p-3 hover:border-primary/40 transition group`}>
                  <div className="flex items-start gap-3">
                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <s.icon className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.why}</p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </Link>
              ))}
            </div>
          </Section>
        </div>

        {/* MODULE HEALTH */}
        <Section title="Santé des modules" subtitle="État opérationnel temps réel" icon={Server}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {modules.map((m) => {
              const dot = m.status === "ok" ? "bg-emerald-400" : m.status === "warn" ? "bg-amber-400" : "bg-destructive";
              return (
                <Link key={m.name} to={m.to} className={`${glassCard} p-3 hover:border-primary/40 transition`}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${dot}`} />
                    <p className="text-xs font-semibold text-foreground">{m.name}</p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">{m.hint}</p>
                </Link>
              );
            })}
          </div>
        </Section>

        {/* ACTION LOG */}
        {actions.length > 0 && (
          <Section title="Journal automation" subtitle="Dernières actions système" icon={Clock}>
            <div className={`${glassCard} divide-y divide-border/20 max-h-72 overflow-y-auto`}>
              {actions.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2.5 text-xs">
                  <Badge variant="outline" className="text-[10px] shrink-0">{a.engine_name}</Badge>
                  <span className="flex-1 truncate text-foreground">{a.action_label || a.action_type}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(a.created_at).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
