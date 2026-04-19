/**
 * UNPRO — Admin Cockpit Minimal
 * 6-KPI snapshot — entry point at /admin-cockpit (parallel to existing /admin).
 */
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Users,
  Inbox,
  TrendingUp,
  AlertTriangle,
  MapPin,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

interface KPI {
  label: string;
  value: string;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone?: "neutral" | "good" | "warn" | "bad";
  to?: string;
}

const KPIS: KPI[] = [
  { label: "Entrepreneurs actifs", value: "147", hint: "+12 / 7j", Icon: Users, tone: "good", to: "/admin/contractors" },
  { label: "Nouveaux leads (24h)", value: "38", hint: "+5 vs hier", Icon: Inbox, tone: "good", to: "/admin/leads" },
  { label: "Revenus MRR", value: "24 380 $", hint: "+8.2 %", Icon: TrendingUp, tone: "good", to: "/admin/dashboard" },
  { label: "Catégories faibles", value: "3", hint: "Plombier, Couvreur, Élec.", Icon: AlertTriangle, tone: "warn", to: "/coverage" },
  { label: "Villes faibles", value: "5", hint: "Sherbrooke, Saguenay…", Icon: MapPin, tone: "warn", to: "/coverage" },
  { label: "Blocages système", value: "2", hint: "Voir détails", Icon: ShieldAlert, tone: "bad", to: "/admin/operations" },
];

const toneCls: Record<NonNullable<KPI["tone"]>, string> = {
  neutral: "text-foreground",
  good: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-rose-400",
};

export default function AdminCockpitMinimal() {
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>UNPRO Admin — Cockpit</title>
      </Helmet>

      <div className="mx-auto max-w-5xl px-5 py-10 flex flex-col gap-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Cockpit</h1>
          <p className="text-sm text-muted-foreground mt-1">État du système en un coup d'œil.</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {KPIS.map((k) => {
            const card = (
              <div
                key={k.label}
                className="rounded-2xl p-5 bg-white/[0.03] border border-white/10 hover:border-white/20 transition flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <k.Icon className={`h-5 w-5 ${toneCls[k.tone || "neutral"]}`} />
                  {k.to && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div>
                  <div className="text-2xl font-semibold tabular-nums">{k.value}</div>
                  <div className="text-sm text-foreground/80 mt-0.5">{k.label}</div>
                  {k.hint && (
                    <div className={`text-xs mt-1 ${toneCls[k.tone || "neutral"]}`}>{k.hint}</div>
                  )}
                </div>
              </div>
            );
            return k.to ? (
              <Link key={k.label} to={k.to}>
                {card}
              </Link>
            ) : (
              card
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <Link
            to="/admin"
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            Vue admin complète →
          </Link>
          <Link
            to="/coverage"
            className="text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition"
          >
            Couverture Ville × Métier →
          </Link>
        </div>
      </div>
    </div>
  );
}
