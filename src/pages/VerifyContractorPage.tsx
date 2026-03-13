import { useState, useCallback, useRef } from "react";
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
import type { VerificationReport, Verdict, RiskSignal, MappedWorkType, VerdictSummary } from "@/services/verification/types";
import {
  Shield, Search, Phone, Building2, FileText, Globe, Camera,
  CheckCircle2, AlertTriangle, XCircle, Ban, Loader2,
  ChevronRight, Scale, Eye, Fingerprint, ShieldAlert,
  Upload, Image, Truck, CreditCard, Receipt, Store, MapPin, ArrowRight,
} from "lucide-react";

type StepStatus = "idle" | "loading" | "done";

interface VerificationStep {
  key: string;
  label: string;
  icon: React.ElementType;
  status: StepStatus;
  verdict?: Verdict;
  detail?: string;
}

const VERDICT_CONFIG: Record<Verdict, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  succes: { label: "Succès", icon: CheckCircle2, color: "text-success", bg: "bg-success/5 border-success/20" },
  attention: { label: "Attention", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/5 border-warning/20" },
  non_succes: { label: "Non-succès", icon: XCircle, color: "text-destructive", bg: "bg-destructive/5 border-destructive/20" },
  se_tenir_loin: { label: "Se tenir loin", icon: Ban, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
};

const INPUT_TYPES = [
  { key: "name", label: "Nom", icon: Building2, placeholder: "Ex: Toitures ABC Inc." },
  { key: "phone", label: "Téléphone", icon: Phone, placeholder: "Ex: 514-555-1234" },
  { key: "rbq", label: "Licence RBQ", icon: FileText, placeholder: "Ex: 5678-1234-01" },
  { key: "neq", label: "NEQ", icon: Scale, placeholder: "Ex: 1234567890" },
  { key: "website", label: "Site web", icon: Globe, placeholder: "Ex: www.toituresabc.com" },
];

const IMAGE_TYPES = [
  { key: "contract", label: "Contrat", icon: FileText },
  { key: "truck", label: "Camion", icon: Truck },
  { key: "business_card", label: "Carte d'affaires", icon: CreditCard },
  { key: "invoice", label: "Facture", icon: Receipt },
  { key: "storefront", label: "Devanture", icon: Store },
  { key: "logo", label: "Logo", icon: Image },
];

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 75 ? "hsl(var(--success))" : score >= 50 ? "hsl(38, 92%, 50%)" : "hsl(var(--destructive))";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-display text-foreground">{score}</span>
        </div>
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
        <Icon className="w-4 h-4 text-primary" />
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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedImageType, setSelectedImageType] = useState<string>("unknown");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const INITIAL_STEPS: VerificationStep[] = [
    { key: "rbq", label: "Validation licence RBQ", icon: FileText, status: "idle" },
    { key: "neq", label: "Validation entreprise / NEQ", icon: Scale, status: "idle" },
    { key: "identity", label: "Cohérence identité", icon: Fingerprint, status: "idle" },
    { key: "risk", label: "Signaux de prudence", icon: ShieldAlert, status: "idle" },
    { key: "scope", label: "Portée de licence", icon: Eye, status: "idle" },
    { key: "visual", label: "Validation UNPRO visuelle", icon: Camera, status: "idle" },
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 10 Mo.");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setSelectedImageType("unknown");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]); // strip data:... prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const simulateSteps = useCallback(async (finalReport: VerificationReport) => {
    const newSteps = [...INITIAL_STEPS];

    const reg = finalReport.registry_validation;
    const entities = finalReport.probable_entities || [];
    const primary = entities[0];
    const risks = finalReport.risk_signals || [];
    const visual = finalReport.visual_extraction;

    const stepVerdicts: Record<string, { verdict: Verdict; detail: string }> = {
      rbq: {
        verdict: reg?.rbq_status === "valid" ? "succes" : reg?.rbq_status === "unknown" ? "attention" : "non_succes",
        detail: reg?.rbq_subcategories?.length
          ? `${reg.rbq_subcategories.length} sous-catégorie(s) détectée(s)`
          : reg?.rbq_status === "not_found" ? "Aucune licence RBQ détectée" : `Statut : ${reg?.rbq_status || "inconnu"}`,
      },
      neq: {
        verdict: reg?.neq_status === "active" ? "succes" : reg?.neq_status === "unknown" ? "attention" : "non_succes",
        detail: reg?.registered_name || `Statut NEQ : ${reg?.neq_status || "inconnu"}`,
      },
      identity: {
        verdict: (primary?.confidence_score ?? 0) >= 70 ? "succes" : (primary?.confidence_score ?? 0) >= 40 ? "attention" : "non_succes",
        detail: primary?.business_name
          ? `${primary.business_name} — confiance ${primary.confidence_score}%`
          : "Identité non reconstruite",
      },
      risk: {
        verdict: risks.length === 0 ? "succes" : risks.some((s) => s.severity === "high") ? "non_succes" : "attention",
        detail: risks.length > 0 ? `${risks.length} signal(s) détecté(s)` : "Aucun signal de prudence",
      },
      scope: {
        verdict: finalReport.license_scope?.project_fit === "compatible" ? "succes"
          : finalReport.license_scope?.project_fit === "partial" ? "attention"
          : finalReport.license_scope?.project_fit === "incompatible" ? "non_succes"
          : "attention",
        detail: finalReport.license_scope?.explanation_fr || `${finalReport.license_scope?.mapped_work_types?.length || 0} type(s) de travaux`,
      },
      visual: {
        verdict: visual?.image_type && visual.image_type !== "unknown"
          ? (visual.business_name ? "succes" : "attention")
          : "attention",
        detail: visual?.image_type && visual.image_type !== "unknown"
          ? `Type : ${visual.image_type}${visual.business_name ? ` — ${visual.business_name}` : ""}`
          : "Aucune image analysée",
      },
    };

    for (let i = 0; i < newSteps.length; i++) {
      newSteps[i] = { ...newSteps[i], status: "loading" };
      setSteps([...newSteps]);
      await new Promise((r) => setTimeout(r, 500 + Math.random() * 700));
      const sv = stepVerdicts[newSteps[i].key];
      newSteps[i] = { ...newSteps[i], status: "done", verdict: sv.verdict, detail: sv.detail };
      setSteps([...newSteps]);
    }
  }, []);

  const handleVerify = async () => {
    if (!input.trim() && !imageFile) {
      toast.error("Veuillez entrer une information ou téléverser une image.");
      return;
    }
    setIsVerifying(true);
    setReport(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "idle" })));

    try {
      const body: any = {
        input: input.trim() || null,
        project_description: projectDesc.trim() || null,
        image_type: imageFile ? selectedImageType : null,
        source_page: "verify",
      };

      if (imageFile) {
        body.image_base64 = await fileToBase64(imageFile);
      }

      const { data, error } = await supabase.functions.invoke("verify-contractor", { body });

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
  const summary = report?.summary_fr as VerdictSummary | undefined;

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden py-12 md:py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 relative z-10 max-w-3xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold font-display text-foreground mb-2">
                Vérification d'entrepreneur
              </h1>
              <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                Validez la licence, l'identité commerciale et la fiabilité d'un entrepreneur.
                Selon les informations publiques disponibles.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Input */}
        <section className="container mx-auto px-4 max-w-2xl -mt-2 pb-6">
          <Card className="shadow-lg border-border/50">
            <CardContent className="p-5 space-y-4">
              {/* Type selector */}
              <div className="flex flex-wrap gap-1.5">
                {INPUT_TYPES.map((t) => {
                  const Icon = t.icon;
                  const active = selectedType === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setSelectedType(active ? null : t.key)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className="w-3 h-3" /> {t.label}
                    </button>
                  );
                })}
              </div>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={INPUT_TYPES.find((t) => t.key === selectedType)?.placeholder || "Nom, téléphone, licence RBQ, NEQ ou site web…"}
                className="h-12 text-sm"
                onKeyDown={(e) => e.key === "Enter" && !isVerifying && handleVerify()}
              />

              {/* Image upload */}
              <div className="space-y-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Téléverser une image (contrat, camion, carte d'affaires…)
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {imagePreview && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
                    <div className="relative rounded-xl overflow-hidden border border-border bg-muted/30">
                      <img src={imagePreview} alt="Aperçu" className="w-full max-h-48 object-contain" />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center text-xs font-bold hover:bg-destructive"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {IMAGE_TYPES.map((t) => {
                        const Icon = t.icon;
                        const active = selectedImageType === t.key;
                        return (
                          <button
                            key={t.key}
                            onClick={() => setSelectedImageType(t.key)}
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border transition-all ${
                              active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border"
                            }`}
                          >
                            <Icon className="w-3 h-3" /> {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </div>

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

              <Button onClick={handleVerify} disabled={isVerifying || (!input.trim() && !imageFile)} className="w-full h-11 text-sm font-semibold gap-2">
                {isVerifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {isVerifying ? "Vérification en cours…" : "Vérifier cet entrepreneur"}
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Steps */}
        <AnimatePresence>
          {steps.length > 0 && (
            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="container mx-auto px-4 max-w-2xl pb-6 space-y-2.5">
              {steps.map((step, i) => <StepRow key={step.key} step={step} index={i} />)}
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
              className="container mx-auto px-4 max-w-2xl pb-16 space-y-5"
            >
              <Separator />

              {/* Verdict Banner */}
              {verdictCfg && FinalVerdictIcon && (
                <Card className={`border-2 ${verdictCfg.bg}`}>
                  <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
                    <FinalVerdictIcon className={`w-12 h-12 ${verdictCfg.color}`} />
                    <div>
                      <h2 className={`text-xl md:text-2xl font-bold font-display ${verdictCfg.color}`}>
                        {verdictCfg.label}
                      </h2>
                      {summary && (
                        <>
                          <p className="text-sm font-semibold text-foreground mt-2">{summary.headline}</p>
                          <p className="text-sm text-muted-foreground mt-1 max-w-md">{summary.short_summary}</p>
                        </>
                      )}
                    </div>

                    {/* Scores */}
                    <div className="flex gap-6 mt-2">
                      <ScoreRing score={report.scores?.unpro_trust_score || 0} label="Confiance UNPRO" />
                      <ScoreRing score={report.scores?.visual_trust_score || 0} label="Confiance visuelle" />
                      {(report.scores?.license_fit_score ?? 0) > 0 && (
                        <ScoreRing score={report.scores.license_fit_score} label="Compatibilité" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Next Steps */}
              {summary?.next_steps && summary.next_steps.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-primary" /> Prochaines étapes recommandées
                    </h3>
                    <ul className="space-y-1.5">
                      {summary.next_steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Identity Card */}
              {report.probable_entities?.[0]?.business_name && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" /> Identité commerciale probable
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        ["Entreprise", report.probable_entities[0].business_name],
                        ["Nom légal", report.probable_entities[0].legal_name],
                        ["Téléphone", report.probable_entities[0].normalized_phone],
                        ["Site web", report.probable_entities[0].website],
                        ["RBQ", report.probable_entities[0].probable_rbq],
                        ["NEQ", report.probable_entities[0].probable_neq],
                        ["Ville", report.probable_entities[0].probable_city],
                        ["Catégorie", report.probable_entities[0].probable_service_category],
                      ]
                        .filter(([, v]) => v)
                        .map(([label, value]) => (
                          <div key={label as string}>
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <p className="font-medium text-foreground truncate">{value}</p>
                          </div>
                        ))}
                    </div>
                    <p className="text-xs text-muted-foreground italic">
                      Confiance : {report.probable_entities[0].confidence_score}%
                      {report.probable_entities[0].evidence?.length > 0 && (
                        <> — {report.probable_entities[0].evidence.length} élément(s) de preuve</>
                      )}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Visual Extraction */}
              {report.visual_extraction?.image_type && report.visual_extraction.image_type !== "unknown" && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" /> Extraction visuelle
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {[
                        ["Type d'image", report.visual_extraction.image_type],
                        ["Entreprise", report.visual_extraction.business_name],
                        ["Téléphone", report.visual_extraction.phone],
                        ["Courriel", report.visual_extraction.email],
                        ["Site web", report.visual_extraction.website],
                        ["RBQ", report.visual_extraction.rbq],
                        ["NEQ", report.visual_extraction.neq],
                        ["Adresse", report.visual_extraction.address],
                        ["Représentant", report.visual_extraction.representative_name],
                      ]
                        .filter(([, v]) => v)
                        .map(([label, value]) => (
                          <div key={label as string}>
                            <span className="text-xs text-muted-foreground">{label}</span>
                            <p className="font-medium text-foreground truncate">{value}</p>
                          </div>
                        ))}
                    </div>
                    {report.visual_extraction.service_keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {report.visual_extraction.service_keywords.map((kw) => (
                          <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                        ))}
                      </div>
                    )}
                    {report.visual_extraction.brand_notes?.length > 0 && (
                      <div className="space-y-1">
                        {report.visual_extraction.brand_notes.map((note, i) => (
                          <p key={i} className="text-xs text-muted-foreground italic">• {note}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* License Scope */}
              {report.license_scope?.mapped_work_types?.length > 0 && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" /> Portée de licence
                    </h3>
                    <div className="space-y-2">
                      {report.license_scope.mapped_work_types.map((sub: MappedWorkType, i: number) => (
                        <div key={i} className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm font-medium text-foreground">{sub.rbq_code} — {sub.label_fr}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {sub.work_types?.map((wt) => (
                              <Badge key={wt} variant="secondary" className="text-xs">{wt}</Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {report.license_scope.explanation_fr && (
                      <p className="text-xs text-muted-foreground italic">{report.license_scope.explanation_fr}</p>
                    )}
                    {report.license_scope.project_fit && (
                      <Badge variant={report.license_scope.project_fit === "compatible" ? "default" : "secondary"} className="text-xs">
                        Projet : {report.license_scope.project_fit}
                      </Badge>
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
                      {report.risk_signals.map((sig: RiskSignal, i: number) => (
                        <div key={i} className={`p-3 rounded-lg border ${
                          sig.severity === "high" ? "bg-destructive/5 border-destructive/20"
                          : sig.severity === "medium" ? "bg-warning/5 border-warning/20"
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

              {/* Registry Details */}
              {report.registry_validation && (
                <Card>
                  <CardContent className="p-5 space-y-3">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" /> Validation des registres
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">RBQ</span>
                        <Badge variant={report.registry_validation.rbq_status === "valid" ? "default" : "secondary"} className="ml-2 text-xs">
                          {report.registry_validation.rbq_status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">NEQ</span>
                        <Badge variant={report.registry_validation.neq_status === "active" ? "default" : "secondary"} className="ml-2 text-xs">
                          {report.registry_validation.neq_status}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Cohérence</span>
                        <Badge variant={report.registry_validation.identity_coherence === "strong" ? "default" : "secondary"} className="ml-2 text-xs">
                          {report.registry_validation.identity_coherence}
                        </Badge>
                      </div>
                      {report.registry_validation.registered_name && (
                        <div>
                          <span className="text-xs text-muted-foreground">Nom légal</span>
                          <p className="font-medium text-foreground">{report.registry_validation.registered_name}</p>
                        </div>
                      )}
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
