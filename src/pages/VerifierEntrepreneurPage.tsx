/**
 * UNPRO — /verifier-un-entrepreneur
 * Premium contractor verification page with form, progress, results, evidence upload.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowRight, Search, Phone, Building2, FileText, Globe, MapPin, RotateCcw } from "lucide-react";
import { useVerifyContractor } from "@/hooks/useVerifyContractor";
import VerificationProgressSteps from "@/components/verify/VerificationProgressSteps";
import { VerificationResultsLayout } from "@/components/verification";
import EvidenceUploadPanel from "@/components/verify/EvidenceUploadPanel";
import type { VerificationFormInput, VerificationOutput, EvidenceType } from "@/types/verification";

type PageState = "form" | "loading" | "results" | "error";

const INPUT_FIELDS = [
  { key: "phone" as const, label: "Téléphone", icon: Phone, placeholder: "Ex: 514-555-1234" },
  { key: "business_name" as const, label: "Nom de l'entreprise", icon: Building2, placeholder: "Ex: Toitures ABC Inc." },
  { key: "rbq_number" as const, label: "Licence RBQ", icon: FileText, placeholder: "Ex: 5678-1234-01" },
  { key: "website" as const, label: "Site web", icon: Globe, placeholder: "Ex: www.toituresabc.com" },
  { key: "city" as const, label: "Ville", icon: MapPin, placeholder: "Ex: Montréal" },
];

export default function VerifierEntrepreneurPage() {
  const [pageState, setPageState] = useState<PageState>("form");
  const [form, setForm] = useState<VerificationFormInput>({});
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<VerificationOutput | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const mutation = useVerifyContractor();

  const hasInput = Object.values(form).some(v => v?.trim());

  // Simulate step progression during loading
  useEffect(() => {
    if (pageState === "loading") {
      setActiveStep(0);
      let step = 0;
      stepTimerRef.current = setInterval(() => {
        step++;
        if (step <= 9) {
          setActiveStep(step);
        }
      }, 600);
    } else {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    }
    return () => {
      if (stepTimerRef.current) clearInterval(stepTimerRef.current);
    };
  }, [pageState]);

  const handleVerify = useCallback(async () => {
    if (!hasInput) return;
    setPageState("loading");
    setResult(null);
    setErrorMsg("");
    setShowEvidence(false);

    try {
      const response = await mutation.mutateAsync({ form });
      setActiveStep(10); // All done
      // Small delay so user sees completion
      setTimeout(() => {
        setResult(response.output);
        setRunId(response.verification_run_id);
        setPageState("results");
        // Scroll to results
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      }, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Une erreur est survenue.");
      setPageState("error");
    }
  }, [form, hasInput, mutation]);

  const handleEvidenceUpload = useCallback(async (base64: string, type: EvidenceType) => {
    if (!runId) return;
    setPageState("loading");
    try {
      const response = await mutation.mutateAsync({
        form,
        image_base64: base64,
        image_type: type,
        verification_run_id: runId,
      });
      setActiveStep(10);
      setTimeout(() => {
        setResult(response.output);
        setPageState("results");
      }, 800);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Erreur lors de l'analyse.");
      setPageState("error");
    }
  }, [form, runId, mutation]);

  const handleReset = () => {
    setPageState("form");
    setForm({});
    setResult(null);
    setRunId(null);
    setErrorMsg("");
    setShowEvidence(false);
  };

  const updateField = (key: keyof VerificationFormInput, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* ═══ HERO ═══ */}
        <section className="relative pt-12 pb-8 md:pt-20 md:pb-12 overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-radial from-primary/6 via-transparent to-transparent opacity-50" />
          </div>

          <div className="container mx-auto px-4 relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[11px] font-semibold tracking-wide uppercase mb-4">
                <Shield className="w-3.5 h-3.5" />
                Moteur de vérification
              </div>

              <h1 className="text-hero-sm md:text-hero font-display text-foreground mb-3">
                Vérifiez un entrepreneur{" "}
                <span className="text-primary">avant d'aller plus loin</span>
              </h1>

              <p className="text-sm md:text-body text-muted-foreground max-w-lg mx-auto leading-relaxed">
                Téléphone, nom, RBQ, site web ou carte d'affaires : UnPRO tente de relier
                les données publiques réelles sans rien inventer.
              </p>
            </motion.div>

            {/* ═══ FORM ═══ */}
            <AnimatePresence mode="wait">
              {pageState === "form" && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 md:p-6 shadow-[var(--shadow-md)]"
                >
                  <div className="space-y-3">
                    {INPUT_FIELDS.map(({ key, label, icon: Icon, placeholder }) => (
                      <div key={key} className="relative">
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                        <div className="relative">
                          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                          <Input
                            value={form[key] || ""}
                            onChange={(e) => updateField(key, e.target.value)}
                            placeholder={placeholder}
                            className="pl-10 h-11 text-sm bg-background/50"
                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleVerify}
                    disabled={!hasInput}
                    size="lg"
                    className="w-full mt-5 h-12 gap-2 font-semibold text-sm"
                  >
                    <Search className="w-4 h-4" />
                    Vérifier maintenant
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  <p className="text-[11px] text-muted-foreground/60 text-center mt-4 max-w-sm mx-auto leading-relaxed">
                    Si les données sont insuffisantes, nous vous demanderons 1 à 3 preuves
                    supplémentaires plutôt que de deviner.
                  </p>
                </motion.div>
              )}

              {/* ═══ LOADING ═══ */}
              {pageState === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 md:p-6 shadow-[var(--shadow-md)]"
                >
                  <h3 className="text-sm font-semibold font-display text-foreground mb-4 text-center">
                    Vérification en cours…
                  </h3>
                  <VerificationProgressSteps activeStep={activeStep} />
                </motion.div>
              )}

              {/* ═══ ERROR ═══ */}
              {pageState === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 md:p-6 text-center"
                >
                  <p className="text-sm text-destructive font-medium mb-3">{errorMsg}</p>
                  <Button onClick={handleReset} variant="outline" size="sm" className="gap-2">
                    <RotateCcw className="w-3.5 h-3.5" /> Réessayer
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ═══ RESULTS ═══ */}
        {pageState === "results" && result && (
          <section ref={resultsRef} className="pb-12 md:pb-20">
            <div className="container mx-auto px-4 max-w-2xl space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="flex items-center justify-between"
              >
                <h2 className="text-section font-display text-foreground">Résultats</h2>
                <Button onClick={handleReset} variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <RotateCcw className="w-3.5 h-3.5" /> Nouvelle vérification
                </Button>
              </motion.div>

              <VerificationResultsLayout
                output={result}
                onUploadEvidence={() => setShowEvidence(true)}
              />

              {/* Evidence upload */}
              <AnimatePresence>
                {showEvidence && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <EvidenceUploadPanel
                      onUpload={handleEvidenceUpload}
                      isLoading={mutation.isPending}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* ═══ FOOTER TRUST ═══ */}
        <section className="py-8 md:py-12 border-t border-border/30">
          <div className="container mx-auto px-4 max-w-2xl text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-muted-foreground/50" />
              <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">
                Engagement UnPRO
              </span>
            </div>
            <p className="text-xs text-muted-foreground/60 max-w-md mx-auto leading-relaxed">
              UnPRO n'invente jamais les données manquantes. En cas d'ambiguïté,
              nous demandons plus de preuves plutôt que de deviner.
            </p>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
