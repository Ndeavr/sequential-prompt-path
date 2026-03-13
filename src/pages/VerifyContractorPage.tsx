import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Shield, Search, Phone, Building2, FileText, Globe, Camera,
  CheckCircle2, AlertTriangle, XCircle, Ban, Loader2,
  ChevronRight, Scale, Eye, MapPin, Fingerprint, ShieldAlert,
} from "lucide-react";

type Verdict = "succes" | "attention" | "non_succes" | "se_tenir_loin";
type StepStatus = "idle" | "loading" | "done";

interface VerificationStep {
  key: string;
  label: string;
  icon: React.ElementType;
  status: StepStatus;
  verdict?: Verdict;
  detail?: string;
}

interface VerificationReport {
  contractor_identity: any;
  rbq_validation: any;
  neq_validation: any;
  license_scope: any;
  visual_validation: any;
  risk_signals: any[];
  trust_score: number;
  license_fit_score: number | null;
  verdict: Verdict;
  verdict_summary: string;
}

const VERDICT_CONFIG: Record<Verdict, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  succes: { label: "Succès", icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" },
  attention: { label: "Attention", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" },
  non_succes: { label: "Non-succès", icon: XCircle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800" },
  se_tenir_loin: { label: "Se tenir loin", icon: Ban, color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700" },
};

const INPUT_TYPES = [
  { key: "name", label: "Nom d'entreprise", icon: Building2, placeholder: "Ex: Toitures ABC Inc." },
  { key: "phone", label: "Téléphone", icon: Phone, placeholder: "Ex: 514-555-1234" },
  { key: "rbq", label: "Licence RBQ", icon: FileText, placeholder: "Ex: 5678-1234-01" },
  { key: "website", label: "Site web", icon: Globe, placeholder: "Ex: www.toituresabc.com" },
];

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 75 ? "hsl(var(--success))" : score >= 50 ? "hsl(38, 92%, 50%)" : "hsl(var(--destructive))";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="4" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="4"
          strokeLinecap="round" strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-lg font-bold font-display text-foreground">{score}</span>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
    </div>
  );
}

function StepRow({ step, index }: { step: VerificationStep; index: number }) {
  const Icon = step.icon;
  const verdictCfg = step.verdict ? VERDICT_CONFIG[step.verdict] : null;
  const VerdictIcon = verdictCfg?.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
        step.status === "done" && verdictCfg ? verdictCfg.bg : "border-border bg-card"
      }`}
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
        step.status === "done" ? "bg-primary/10" : "bg-muted"
      }`}>
        <Icon className="w-4.5 h-4.5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{step.label}</p>
        {step.status === "loading" && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <Loader2 className="w-3 h-3 animate-spin" /> En cours de validation…
          </p>
        )}
        {step.status === "done" && step.detail && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{step.detail}</p>
        )}
      </div>

      {step.status === "done" && verdictCfg && VerdictIcon && (
        <Badge variant="outline" className={`flex-shrink-0 gap-1 ${verdictCfg.color} border-current/20`}>
          <VerdictIcon className="w-3.5 h-3.5" />
          {verdictCfg.label}
        </Badge>
      )}
    </motion.div>
  );
}

export default function VerifyContractorPage() {
  const [input, setInput] = useState("");
  const [projectDesc, setProjectDesc] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [steps, setSteps] = useState<VerificationStep[]>([]);
  const [showProject, setShowProject] = useState(false);

  const INITIAL_STEPS: VerificationStep[] = [
    { key: "rbq", label: "Validation licence RBQ", icon: FileText, status: "idle" },
    { key: "neq", label: "Validation entreprise / NEQ", icon: Scale, status: "idle" },
    { key: "identity", label: "Cohérence identité", icon: Fingerprint, status: "idle" },
    { key: "risk", label: "Signaux de prudence", icon: ShieldAlert, status: "idle" },
    { key: "scope", label: "Portée de licence", icon: Eye, status: "idle" },
    { key: "visual", label: "Validation UNPRO visuelle", icon: Camera, status: "idle" },
  ];

  const simulateSteps = useCallback(async (finalReport: VerificationReport) => {
    const newSteps = [...INITIAL_STEPS];

    const stepVerdicts: Record<string, { verdict: Verdict; detail: string }> = {
      rbq: {
        verdict: finalReport.rbq_validation?.status === "valid" ? "succes" : finalReport.rbq_validation?.status === "unknown" ? "attention" : "non_succes",
        detail: finalReport.rbq_validation?.notes || "",
      },
      neq: {
        verdict: finalReport.neq_validation?.status === "active" ? "succes" : finalReport.neq_validation?.status === "unknown" ? "attention" : "non_succes",
        detail: finalReport.neq_validation?.notes || "",
      },
      identity: {
        verdict: (finalReport.contractor_identity?.confidence ?? 0) >= 70 ? "succes" : (finalReport.contractor_identity?.confidence ?? 0) >= 40 ? "attention" : "non_succes",
        detail: finalReport.contractor_identity?.source_notes || "",
      },
      risk: {
        verdict: finalReport.risk_signals?.length === 0 ? "succes" : finalReport.risk_signals?.some((s: any) => s.severity === "high") ? "non_succes" : "attention",
        detail: finalReport.risk_signals?.length > 0 ? `${finalReport.risk_signals.length} signal(s) détecté(s)` : "Aucun signal de prudence",
      },
      scope: {
        verdict: finalReport.license_scope?.project_compatibility === "compatible" ? "succes" : finalReport.license_scope?.project_compatibility === "partial" ? "attention" : finalReport.license_scope?.project_compatibility ? "non_succes" : "attention",
        detail: finalReport.license_scope?.compatibility_notes || `${finalReport.license_scope?.declared_subcategories?.length || 0} sous-catégorie(s) détectée(s)`,
      },
      visual: {
        verdict: "attention" as Verdict,
        detail: "Aucune image soumise — vérification visuelle non effectuée",
      },
    };

    for (let i = 0; i < newSteps.length; i++) {
      newSteps[i] = { ...newSteps[i], status: "loading" };
      setSteps([...newSteps]);
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
      const sv = stepVerdicts[newSteps[i].key];
      newSteps[i] = { ...newSteps[i], status: "done", verdict: sv.verdict, detail: sv.detail };
      setSteps([...newSteps]);
    }
  }, []);

  const handleVerify = async () => {
    if (!input.trim()) { toast.error("Veuillez entrer une information."); return; }
    setIsVerifying(true);
    setReport(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "idle" })));

    try {
      const { data, error } = await supabase.functions.invoke("verify-contractor", {
        body: { input: input.trim(), project_description: projectDesc.trim() || null },
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erreur inconnue");

      const finalReport = data.report as VerificationReport;
      setReport(finalReport);
      await simulateSteps(finalReport);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur lors de la vérification");
      setSteps([]);
    } finally {
      setIsVerifying(false);
    }
  };

  const verdictCfg = report?.verdict ? VERDICT_CONFIG[report.verdict] : null;
  const FinalVerdictIcon = verdictCfg?.icon;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 relative z-10 max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-3">
                Vérification d'entrepreneur
              </h1>
              <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
                Validez la licence, l'identité et la fiabilité d'un entrepreneur avant de signer.
                Selon les informations publiques disponibles.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Input */}
        <section className="container mx-auto px-4 max-w-2xl -mt-4 pb-8">
          <Card className="shadow-lg border-border/50">
            <CardContent className="p-6 space-y-5">
              {/* Type selector chips */}
              <div className="flex flex-wrap gap-2">
                {INPUT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = selectedType === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setSelectedType(active ? null : t.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={INPUT_TYPES.find((t) => t.key === selectedType)?.placeholder || "Nom, téléphone, licence RBQ, site web…"}
                className="h-12 text-base"
                onKeyDown={(e) => e.key === "Enter" && !isVerifying && handleVerify()}
              />

              {/* Optional project */}
              <button
                onClick={() => setShowProject(!showProject)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${showProject ? "rotate-90" : ""}`} />
                Décrire votre projet (optionnel)
              </button>

              <AnimatePresence>
                {showProject && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <Textarea
                      value={projectDesc}
                      onChange={(e) => setProjectDesc(e.target.value)}
                      placeholder="Ex: Remplacement de toiture en bardeaux, maison de 1 200 pi²…"
                      rows={3}
                      className="text-sm"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <Button onClick={handleVerify} disabled={isVerifying || !input.trim()} className="w-full h-11 text-sm font-semibold gap-2">
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isVerifying ? "Vérification en cours…" : "Vérifier cet entrepreneur"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Steps */}
        <AnimatePresence>
          {steps.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="container mx-auto px-4 max-w-2xl pb-8 space-y-3"
            >
              {steps.map((step, i) => (
                <StepRow key={step.key} step={step} index={i} />
              ))}
            </motion.section>
          )}
        </AnimatePresence>

        {/* Final Report */}
        <AnimatePresence>
          {report && steps.every((s) => s.status === "done") && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="container mx-auto px-4 max-w-2xl pb-16 space-y-6"
            >
              <Separator />

              {/* Verdict Banner */}
              {verdictCfg && FinalVerdictIcon && (
                <Card className={`border-2 ${verdictCfg.bg}`}>
                  <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                    <FinalVerdictIcon className={`w-12 h-12 ${verdictCfg.color}`} />
                    <div>
                      <h2 className={`text-2xl font-bold font-display ${verdictCfg.color}`}>
                        {verdictCfg.label}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        {report.verdict_summary}
                      </p>
                    </div>

                    {/* Scores */}
                    <div className="flex gap-8 mt-2">
                      <div className="relative">
                        <ScoreRing score={report.trust_score} label="Score Confiance" />
                      </div>
                      {report.license_fit_score != null && (
                        <div className="relative">
                          <ScoreRing score={report.license_fit_score} label="Compatibilité" />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Identity Card */}
              {report.contractor_identity?.business_name && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" /> Identité reconstruite
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        ["Entreprise", report.contractor_identity.business_name],
                        ["Nom légal", report.contractor_identity.legal_name],
                        ["Téléphone", report.contractor_identity.phone],
                        ["Site web", report.contractor_identity.website],
                        ["Licence RBQ", report.contractor_identity.rbq_license],
                        ["NEQ", report.contractor_identity.neq],
                        ["Ville", report.contractor_identity.city],
                      ]
                        .filter(([, v]) => v)
                        .map(([label, value]) => (
                          <div key={label}>
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <p className="font-medium text-foreground truncate">{value}</p>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Confiance : {report.contractor_identity.confidence}% — {report.contractor_identity.source_notes}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* License Scope */}
              {report.license_scope?.declared_subcategories?.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" /> Portée de licence
                    </h3>
                    <div className="space-y-2">
                      {report.license_scope.declared_subcategories.map((sub: any, i: number) => (
                        <div key={i} className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm font-medium text-foreground">{sub.code} — {sub.label}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {sub.work_types?.map((wt: string) => (
                              <Badge key={wt} variant="secondary" className="text-xs">{wt}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {report.license_scope.compatibility_notes && (
                      <p className="text-xs text-muted-foreground italic">{report.license_scope.compatibility_notes}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Risk Signals */}
              {report.risk_signals?.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-destructive" /> Signaux de prudence
                    </h3>
                    <div className="space-y-2">
                      {report.risk_signals.map((sig: any, i: number) => (
                        <div key={i} className={`p-3 rounded-lg border ${
                          sig.severity === "high"
                            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                            : sig.severity === "medium"
                            ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                            : "bg-muted/30 border-border"
                        }`}>
                          <p className="text-sm font-medium text-foreground">{sig.signal}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{sig.detail}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center italic px-4">
                Ce rapport est généré selon les informations publiques disponibles. Il ne constitue pas un avis juridique.
                Vérification complémentaire recommandée auprès de la RBQ et du Registraire des entreprises du Québec.
              </p>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </MainLayout>
  );
}
