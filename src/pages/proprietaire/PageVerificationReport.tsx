/**
 * PageVerificationReport — Private homeowner verification report.
 *
 * Route: /proprietaire/verifications/:reportId
 *
 * Access is enforced by RLS: only rows whose user_id = auth.uid() are
 * returned. Any mismatch renders the "not found" state, never real data.
 */
import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  ShieldX,
  ArrowLeft,
  Loader2,
  ChevronRight,
  FileText,
  Home as HomeIcon,
} from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Verdict = "succes" | "attention" | "non_succes" | "se_tenir_loin" | null;

interface ReportRow {
  id: string;
  user_id: string | null;
  verdict: Verdict;
  identity_confidence_score: number | null;
  public_trust_score: number | null;
  visual_trust_score: number | null;
  input_business_name: string | null;
  input_rbq: string | null;
  input_neq: string | null;
  input_phone: string | null;
  input_website: string | null;
  input_city: string | null;
  identity_resolution_status: string | null;
  summary_headline: string | null;
  summary_short: string | null;
  summary_next_steps: unknown;
  inconsistencies_json: unknown;
  missing_proofs_json: unknown;
  recommended_next_inputs_json: unknown;
  raw_findings_json: unknown;
  created_at: string;
}

const verdictConfig: Record<
  Exclude<Verdict, null>,
  { label: string; Icon: typeof ShieldCheck; className: string; ring: string }
> = {
  succes: {
    label: "Vérification favorable",
    Icon: ShieldCheck,
    className: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
    ring: "ring-emerald-500/30",
  },
  attention: {
    label: "À valider avec vigilance",
    Icon: ShieldAlert,
    className: "text-amber-600 bg-amber-500/10 border-amber-500/30",
    ring: "ring-amber-500/30",
  },
  non_succes: {
    label: "Éléments manquants",
    Icon: Shield,
    className: "text-orange-600 bg-orange-500/10 border-orange-500/30",
    ring: "ring-orange-500/30",
  },
  se_tenir_loin: {
    label: "Se tenir loin",
    Icon: ShieldX,
    className: "text-red-600 bg-red-500/10 border-red-500/30",
    ring: "ring-red-500/30",
  },
};

function ScoreRing({ label, value }: { label: string; value: number | null }) {
  const pct = typeof value === "number" ? Math.max(0, Math.min(100, value)) : 0;
  const hasValue = typeof value === "number";
  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-3">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-bold text-foreground tabular-nums">
          {hasValue ? pct : "—"}
        </span>
        {hasValue && <span className="text-sm text-muted-foreground">/100</span>}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70"
        />
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  tone = "neutral",
}: {
  title: string;
  items: string[];
  tone?: "neutral" | "warn" | "risk";
}) {
  if (!items.length) return null;
  const toneClass =
    tone === "risk"
      ? "text-red-600"
      : tone === "warn"
      ? "text-amber-600"
      : "text-foreground";
  return (
    <div>
      <p className="text-sm font-semibold text-foreground mb-2">{title}</p>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className={`text-sm ${toneClass} flex gap-2`}>
            <ChevronRight className="w-4 h-4 mt-0.5 shrink-0 opacity-60" />
            <span className="leading-relaxed">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      if (typeof r === "string") return r;
      if (r && typeof r === "object") {
        const anyR = r as Record<string, unknown>;
        return (
          (anyR.text as string) ||
          (anyR.label as string) ||
          (anyR.message as string) ||
          (anyR.reason as string) ||
          ""
        );
      }
      return "";
    })
    .filter(Boolean);
}

export default function PageVerificationReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { session, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<ReportRow | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.user) {
      navigate(
        `/auth?redirect=${encodeURIComponent(
          `/proprietaire/verifications/${reportId ?? ""}`,
        )}`,
      );
      return;
    }
    if (!reportId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("contractor_verification_runs")
        .select(
          "id,user_id,verdict,identity_confidence_score,public_trust_score,visual_trust_score,input_business_name,input_rbq,input_neq,input_phone,input_website,input_city,identity_resolution_status,summary_headline,summary_short,summary_next_steps,inconsistencies_json,missing_proofs_json,recommended_next_inputs_json,raw_findings_json,created_at",
        )
        .eq("id", reportId)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setReport(null);
      } else {
        setReport(data as ReportRow);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, session?.user, reportId, navigate]);

  if (authLoading || loading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (notFound || !report) {
    return (
      <MainLayout>
        <Helmet>
          <title>Rapport introuvable — UNPRO</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <div className="container mx-auto max-w-2xl px-4 py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-6 flex items-center justify-center">
            <FileText className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">
            Rapport introuvable
          </h1>
          <p className="text-muted-foreground mb-8">
            Ce rapport n'est pas disponible pour votre compte, ou il n'existe
            pas.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild variant="outline">
              <Link to="/verifier-entrepreneur">
                <ArrowLeft className="w-4 h-4 mr-2" /> Nouvelle vérification
              </Link>
            </Button>
            <Button asChild>
              <Link to="/">
                <HomeIcon className="w-4 h-4 mr-2" /> Retour à l'accueil
              </Link>
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  const verdictKey = (report.verdict ?? "attention") as Exclude<Verdict, null>;
  const v = verdictConfig[verdictKey] ?? verdictConfig.attention;
  const strengths = asStringArray(
    (report.raw_findings_json as { strengths?: unknown })?.strengths,
  );
  const risks = asStringArray(
    (report.raw_findings_json as { risks?: unknown })?.risks,
  );
  const inconsistencies = asStringArray(report.inconsistencies_json);
  const missingProofs = asStringArray(report.missing_proofs_json);
  const nextSteps = asStringArray(report.summary_next_steps);
  const recommended = asStringArray(report.recommended_next_inputs_json);

  return (
    <MainLayout>
      <Helmet>
        <title>
          Rapport de vérification — {report.input_business_name ?? "Entrepreneur"} — UNPRO
        </title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="container mx-auto max-w-4xl px-4 py-8 md:py-12">
        <div className="mb-6">
          <Link
            to="/verifier-entrepreneur"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Nouvelle vérification
          </Link>
        </div>

        <div className="mb-8">
          <Badge variant="outline" className="mb-3 uppercase tracking-wider text-[10px]">
            Rapport privé
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {report.input_business_name || "Entrepreneur analysé"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {[report.input_city, report.input_rbq && `RBQ ${report.input_rbq}`, report.input_neq && `NEQ ${report.input_neq}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Vérifié le{" "}
            {new Date(report.created_at).toLocaleString("fr-CA", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>

        {/* Verdict */}
        <div
          className={`rounded-2xl border ${v.className} p-5 md:p-6 mb-6`}
        >
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-card flex items-center justify-center shrink-0">
              <v.Icon className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-80">
                {v.label}
              </p>
              <p className="text-base font-semibold text-foreground leading-snug">
                {report.summary_headline ||
                  "Analyse complète disponible ci-dessous."}
              </p>
              {report.summary_short && (
                <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                  {report.summary_short}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="grid gap-3 md:grid-cols-3 mb-6">
          <ScoreRing label="Identité" value={report.identity_confidence_score} />
          <ScoreRing label="Confiance publique" value={report.public_trust_score} />
          <ScoreRing label="Cohérence visuelle" value={report.visual_trust_score} />
        </div>

        {/* Lists */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-5">
            <ListBlock title="Points forts" items={strengths} />
            <ListBlock title="Prochaines étapes" items={nextSteps} />
            <ListBlock title="Preuves à demander" items={recommended} tone="warn" />
          </div>
          <div className="space-y-5">
            <ListBlock title="Risques identifiés" items={risks} tone="risk" />
            <ListBlock title="Incohérences" items={inconsistencies} tone="risk" />
            <ListBlock title="Preuves manquantes" items={missingProofs} tone="warn" />
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-border/50 bg-muted/30 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              Besoin d'un accompagnement ?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Alex peut vous guider vers l'entrepreneur adéquat pour votre projet.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/">Ouvrir Alex</Link>
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
