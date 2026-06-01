/**
 * PageEntrepreneurImportProcessing — REAL pipeline. Streams live extraction
 * results from contractor_import_runs/assets/scores. No mock data, no fake
 * "missing" labels until run.status === 'completed'.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, AlertTriangle, Circle, Phone, MapPin, Award, Shield, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  startImport,
  subscribeToRun,
  getRun,
  getAssets,
  getScores,
  type ImportRun,
  type ImportAssets,
  type ImportScores,
} from "@/services/importIntelligenceService";

type StageState = "pending" | "running" | "detected" | "partial" | "missing";

const STAGE_COLORS: Record<StageState, string> = {
  pending: "text-muted-foreground",
  running: "text-blue-400",
  detected: "text-emerald-400",
  partial: "text-amber-400",
  missing: "text-red-400",
};

function StageIcon({ status }: { status: StageState }) {
  if (status === "running") return <Loader2 className={`h-4 w-4 animate-spin ${STAGE_COLORS[status]}`} />;
  if (status === "detected") return <CheckCircle2 className={`h-4 w-4 ${STAGE_COLORS[status]}`} />;
  if (status === "partial") return <AlertTriangle className={`h-4 w-4 ${STAGE_COLORS[status]}`} />;
  if (status === "missing") return <AlertTriangle className={`h-4 w-4 ${STAGE_COLORS[status]}`} />;
  return <Circle className={`h-4 w-4 ${STAGE_COLORS[status]}`} />;
}

export default function PageEntrepreneurImportProcessing() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [runId, setRunId] = useState<string | null>(params.get("run"));
  const [run, setRun] = useState<ImportRun | null>(null);
  const [assets, setAssets] = useState<ImportAssets | null>(null);
  const [scores, setScores] = useState<ImportScores | null>(null);
  const [alexLines, setAlexLines] = useState<string[]>([]);
  const [bootError, setBootError] = useState<string | null>(null);

  // Start a fresh run if none in URL — read prior input from session
  useEffect(() => {
    if (runId) return;
    const stash = sessionStorage.getItem("unpro:importIntent");
    if (!stash) {
      setBootError("Aucune information à importer. Recommencez l'analyse.");
      return;
    }
    try {
      const input = JSON.parse(stash);
      startImport(input)
        .then((r) => {
          setRunId(r.run_id);
          navigate(`/entrepreneur/import/processing?run=${r.run_id}`, { replace: true });
        })
        .catch((e) => setBootError(e?.message || "Erreur démarrage import"));
    } catch (e: any) {
      setBootError(e?.message || "Erreur");
    }
  }, [runId, navigate]);

  // Initial fetch + realtime subscribe
  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    (async () => {
      const [r, a, s] = await Promise.all([getRun(runId), getAssets(runId), getScores(runId)]);
      if (cancelled) return;
      if (r) setRun(r);
      if (a) setAssets(a);
      if (s) setScores(s);
    })();
    const unsub = subscribeToRun(runId, ({ run: nr, assets: na, scores: ns }) => {
      if (nr) setRun(nr);
      if (na) setAssets(na);
      if (ns) setScores(ns);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [runId]);

  // Build Alex commentary from stages
  useEffect(() => {
    if (!run?.stages) return;
    const lines = run.stages
      .filter((s) => s.status === "detected" || s.status === "partial")
      .map((s) => s.label);
    setAlexLines(lines);
  }, [run]);

  const completed = run?.status === "completed";
  const failed = run?.status === "failed";

  // Detection cards — only show "missing" if run completed and value absent
  const detections = useMemo(() => {
    const a = assets;
    const isDone = completed;
    const detect = (val: any, label: string, render?: string): { label: string; status: StageState; value?: string } => {
      const has = Array.isArray(val) ? val.length > 0 : !!val;
      if (has) return { label, status: "detected", value: render || (typeof val === "string" ? val : Array.isArray(val) ? `${val.length}` : "✓") };
      if (!isDone) return { label, status: "running" };
      return { label, status: "missing" };
    };
    if (!a) {
      return [
        { label: "Logo", status: "running" as StageState },
        { label: "Téléphone", status: "running" as StageState },
        { label: "Photos", status: "running" as StageState },
        { label: "Services", status: "running" as StageState },
        { label: "Villes desservies", status: "running" as StageState },
        { label: "RBQ", status: "running" as StageState },
      ];
    }
    return [
      detect(a.logo_url, "Logo", "Détecté"),
      detect(a.phone, "Téléphone", a.phone || undefined),
      detect(a.gallery, "Photos", `${a.gallery?.length || 0} importées`),
      detect(a.services, "Services", `${a.services?.length || 0} identifiés`),
      detect(a.service_cities, "Villes desservies", `${a.service_cities?.length || 0} détectées`),
      detect(a.rbq_number, "RBQ", a.rbq_number || undefined),
      detect(a.certifications, "Certifications", `${a.certifications?.length || 0}`),
      detect(a.testimonials, "Témoignages", `${a.testimonials?.length || 0}`),
      detect(Object.keys(a.social_links || {}).length > 0, "Liens sociaux", `${Object.keys(a.social_links || {}).length}`),
      detect(a.financing_mentioned, "Financement", a.financing_mentioned ? "Mentionné" : undefined),
    ];
  }, [assets, completed]);

  if (bootError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#050816] text-white">
        <Card className="max-w-md p-6 bg-white/5 border-white/10">
          <h2 className="text-lg font-bold mb-2">Analyse impossible</h2>
          <p className="text-sm text-white/70 mb-4">{bootError}</p>
          <Button onClick={() => navigate("/entrepreneur")}>Retour</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050816] text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[400px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] rounded-full bg-cyan-500/8 blur-[120px]" />
      </div>

      <div className="relative max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-xs border-white/10 bg-white/5">
            <Sparkles className="w-3 h-3 mr-1" />
            UNPRO Intelligence
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {completed ? "Profil importé" : failed ? "Analyse interrompue" : "Analyse en cours…"}
          </h1>
          {run?.domain && <p className="text-xs text-white/50">{run.domain}</p>}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-white/60">
            <span>{run?.current_stage || "Initialisation"}</span>
            <span>{run?.progress ?? 0}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-400 to-cyan-400"
              animate={{ width: `${run?.progress ?? 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Detected assets — logo + hero */}
        {(assets?.logo_url || assets?.hero_image_url || assets?.business_name) && (
          <Card className="p-5 bg-white/[0.04] border-white/10 backdrop-blur-xl rounded-[28px]">
            <div className="flex items-center gap-4">
              {assets?.logo_url && (
                <img src={assets.logo_url} alt="logo" className="w-16 h-16 rounded-xl object-contain bg-white/5 p-2 border border-white/10" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-lg font-bold truncate">{assets?.business_name || "Entreprise"}</div>
                {assets?.address && <div className="text-xs text-white/60 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{assets.address}</div>}
                {assets?.phone && <div className="text-xs text-white/60 flex items-center gap-1 mt-0.5"><Phone className="h-3 w-3" />{assets.phone}</div>}
              </div>
            </div>
            {assets?.description && <p className="text-sm text-white/70 mt-3 line-clamp-3">{assets.description}</p>}
          </Card>
        )}

        {/* Detection grid */}
        <div>
          <div className="text-xs uppercase tracking-wider text-white/40 mb-2">Détections en direct</div>
          <div className="grid grid-cols-2 gap-2">
            <AnimatePresence>
              {detections.map((d, i) => (
                <motion.div
                  key={d.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-center gap-2 p-3 rounded-2xl bg-white/[0.03] border border-white/5"
                >
                  <StageIcon status={d.status as StageState} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white/80 truncate">{d.label}</div>
                    {d.value && <div className="text-[11px] text-white/50 truncate">{d.value}</div>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Gallery */}
        {assets && assets.gallery?.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wider text-white/40 mb-2">{assets.gallery.length} photos importées</div>
            <div className="grid grid-cols-3 gap-2">
              {assets.gallery.slice(0, 9).map((src, i) => (
                <motion.img
                  key={src}
                  src={src}
                  alt=""
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="aspect-square object-cover rounded-xl bg-white/5 border border-white/5"
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                />
              ))}
            </div>
          </div>
        )}

        {/* Services + cities */}
        {assets && ((assets.services?.length || 0) > 0 || (assets.service_cities?.length || 0) > 0) && (
          <Card className="p-4 bg-white/[0.04] border-white/10 rounded-[28px] space-y-3">
            {assets.services?.length > 0 && (
              <div>
                <div className="text-xs text-white/50 mb-1.5">Services détectés</div>
                <div className="flex flex-wrap gap-1.5">
                  {assets.services.slice(0, 12).map((s) => (
                    <Badge key={s} variant="outline" className="text-[11px] border-white/10 bg-white/5">{s}</Badge>
                  ))}
                </div>
              </div>
            )}
            {assets.service_cities?.length > 0 && (
              <div>
                <div className="text-xs text-white/50 mb-1.5">Territoires</div>
                <div className="flex flex-wrap gap-1.5">
                  {assets.service_cities.slice(0, 10).map((c) => (
                    <Badge key={c} variant="outline" className="text-[11px] border-white/10 bg-white/5">{c}</Badge>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Score ring (only after scoring) */}
        {scores && (
          <Card className="p-5 bg-gradient-to-br from-emerald-500/10 to-cyan-500/5 border-emerald-400/20 rounded-[28px]">
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgb(52 211 153)" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(scores.completeness_score / 100) * 213.6} 213.6`} />
                </svg>
                <div className="text-xl font-bold">{scores.completeness_score}%</div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold">Profil importé à {scores.completeness_score}%</div>
                <div className="text-xs text-white/60 mt-0.5">Confiance: {scores.trust_score}/100 · SEO: {scores.seo_score}/100</div>
              </div>
            </div>
            {scores.quick_wins?.length > 0 && (
              <div className="mt-4 space-y-1.5">
                <div className="text-xs uppercase tracking-wider text-white/50">Quick wins</div>
                {scores.quick_wins.map((w) => (
                  <div key={w} className="flex items-start gap-2 text-xs text-white/80">
                    <Sparkles className="h-3 w-3 mt-0.5 text-amber-400" /> {w}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Alex live commentary */}
        {alexLines.length > 0 && !completed && (
          <Card className="p-3 bg-blue-500/5 border-blue-400/20 rounded-2xl">
            <AnimatePresence mode="popLayout">
              {alexLines.slice(-2).map((l) => (
                <motion.div key={l} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  className="text-xs text-blue-200/80">
                  → {l}
                </motion.div>
              ))}
            </AnimatePresence>
          </Card>
        )}

        {failed && (
          <Card className="p-4 bg-red-500/10 border-red-400/20 rounded-2xl">
            <div className="text-sm text-red-200">Nous n'avons pas pu compléter l'analyse. {run?.error}</div>
            <Button size="sm" variant="outline" className="mt-3" onClick={() => navigate("/entrepreneur")}>Réessayer</Button>
          </Card>
        )}

        {completed && (
          <div className="sticky bottom-4">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-bold rounded-2xl"
              onClick={() => navigate("/entrepreneur/onboarding/plan")}
            >
              Voir mon plan recommandé <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
