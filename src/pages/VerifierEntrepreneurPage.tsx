/**
 * UNPRO — /verifier-un-entrepreneur
 * Premium contractor verification page.
 *
 * States: idle → loading → results | error | evidence_pending
 * Anti-hallucination: Never fabricates data. Shows safe fallbacks.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shield, ArrowRight, Search, Phone, Building2, FileText, Globe, MapPin, RotateCcw, AlertTriangle } from "lucide-react";
import { useVerifyContractor } from "@/hooks/useVerifyContractor";
import BusinessNameSearch, { type BusinessSearchResult } from "@/components/contractor/BusinessNameSearch";
import VerificationProgressSteps from "@/components/verify/VerificationProgressSteps";
import { VerificationResultsLayout } from "@/components/verification";
import EvidenceUploadPanel from "@/components/verify/EvidenceUploadPanel";
import type { VerificationFormInput, VerificationOutput, EvidenceType } from "@/types/verification";

/**
 * Page states — explicit state machine for clarity.
 * "evidence_pending" = user uploaded evidence, awaiting re-run.
 */
type PageState = "idle" | "loading" | "results" | "error" | "evidence_pending";

const INPUT_FIELDS = [
  { key: "phone" as const, label: "Téléphone", icon: Phone, placeholder: "Ex : 514-555-1234", autoComplete: "tel" },
  { key: "business_name" as const, label: "Nom de l'entreprise", icon: Building2, placeholder: "Ex : Toitures ABC Inc.", autoComplete: "organization" },
  { key: "rbq_number" as const, label: "Licence RBQ", icon: FileText, placeholder: "Ex : 5678-1234-01", autoComplete: "off" },
  { key: "website" as const, label: "Site web", icon: Globe, placeholder: "Ex : www.toituresabc.com", autoComplete: "url" },
  { key: "city" as const, label: "Ville", icon: MapPin, placeholder: "Ex : Montréal", autoComplete: "address-level2" },
] as const;

/** Count how many non-empty fields the user filled */
function countFilledFields(form: VerificationFormInput): number {
  return Object.values(form).filter((v) => v?.trim()).length;
}

/** Check if the input is phone-only (weak matching signal) */
function isPhoneOnly(form: VerificationFormInput): boolean {
  const filled = Object.entries(form).filter(([, v]) => v?.trim());
  return filled.length === 1 && filled[0][0] === "phone";
}

export default function VerifierEntrepreneurPage() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [form, setForm] = useState<VerificationFormInput>({});
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<VerificationOutput | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showEvidence, setShowEvidence] = useState(false);
  const [phoneOnlyWarningDismissed, setPhoneOnlyWarningDismissed] = useState(false);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const mutation = useVerifyContractor();

  const hasInput = Object.values(form).some((v) => v?.trim());
  const filledCount = countFilledFields(form);
  const showPhoneOnlyWarning = isPhoneOnly(form) && !phoneOnlyWarningDismissed;

  // Step progression during loading — tied to actual backend call lifecycle
  useEffect(() => {
    if (pageState === "loading") {
      setActiveStep(0);
      let step = 0;
      stepTimerRef.current = setInterval(() => {
        step++;
        if (step <= 9) setActiveStep(step);
      }, 650);
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
      setActiveStep(10);
      // Brief pause so user sees final step complete
      setTimeout(() => {
        setResult(response.output);
        setRunId(response.verification_run_id);
        setPageState("results");
        setTimeout(
          () => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
          100
        );
      }, 700);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de la vérification. Veuillez réessayer."
      );
      setPageState("error");
    }
  }, [form, hasInput, mutation]);

  const handleEvidenceUpload = useCallback(
    async (base64: string, type: EvidenceType) => {
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
        }, 700);
      } catch (err) {
        setErrorMsg(
          err instanceof Error ? err.message : "Erreur lors de l'analyse de la preuve."
        );
        setPageState("error");
      }
    },
    [form, runId, mutation]
  );

  const handleReset = () => {
    setPageState("idle");
    setForm({});
    setResult(null);
    setRunId(null);
    setErrorMsg("");
    setShowEvidence(false);
    setPhoneOnlyWarningDismissed(false);
  };

  const updateField = (key: keyof VerificationFormInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key !== "phone") setPhoneOnlyWarningDismissed(false);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* ═══ HERO ═══ */}
        <section className="relative pt-12 pb-8 md:pt-20 md:pb-12 overflow-hidden">
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

            {/* ═══ FORM / LOADING / ERROR ═══ */}
            <AnimatePresence mode="wait">
              {(pageState === "idle" || pageState === "evidence_pending") && (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 md:p-6 shadow-[var(--shadow-md)]"
                  role="form"
                  aria-label="Formulaire de vérification d'entrepreneur"
                >
                  <div className="space-y-3">
                    {INPUT_FIELDS.map(({ key, label, icon: Icon, placeholder, autoComplete }) => (
                      <div key={key}>
                        <label
                          htmlFor={`verify-${key}`}
                          className="text-xs font-medium text-muted-foreground mb-1 block"
                        >
                          {label}
                        </label>
                        <div className="relative">
                          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" aria-hidden="true" />
                          <Input
                            id={`verify-${key}`}
                            value={form[key] || ""}
                            onChange={(e) => updateField(key, e.target.value)}
                            placeholder={placeholder}
                            autoComplete={autoComplete}
                            className="pl-10 h-11 text-sm bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/40"
                            onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Phone-only warning — anti-hallucination UX */}
                  {showPhoneOnlyWarning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            Ce numéro seul ne permet pas d'identifier une entreprise unique avec assez de certitude.
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                            Ajoutez le nom de l'entreprise, le numéro RBQ, ou le site web pour
                            améliorer la correspondance. Vous pouvez continuer, mais les résultats
                            seront moins fiables.
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs mt-1.5 h-7 px-2 text-muted-foreground"
                            onClick={() => setPhoneOnlyWarningDismissed(true)}
                          >
                            Continuer quand même →
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <Button
                    onClick={handleVerify}
                    disabled={!hasInput || (showPhoneOnlyWarning && !phoneOnlyWarningDismissed)}
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

                  {filledCount > 0 && (
                    <p className="text-[10px] text-center text-muted-foreground/40 mt-2">
                      {filledCount} identifiant{filledCount > 1 ? "s" : ""} fourni{filledCount > 1 ? "s" : ""}
                      {filledCount >= 3 ? " — bonne couverture" : filledCount >= 2 ? " — couverture partielle" : ""}
                    </p>
                  )}
                </motion.div>
              )}

              {pageState === "loading" && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 md:p-6 shadow-[var(--shadow-md)]"
                  role="status"
                  aria-label="Vérification en cours"
                  aria-live="polite"
                >
                  <h3 className="text-sm font-semibold font-display text-foreground mb-4 text-center">
                    Vérification en cours…
                  </h3>
                  <VerificationProgressSteps activeStep={activeStep} />
                  <p className="text-[10px] text-center text-muted-foreground/50 mt-4">
                    Analyse des données publiques disponibles. Aucune donnée n'est fabriquée.
                  </p>
                </motion.div>
              )}

              {pageState === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 md:p-6 text-center"
                  role="alert"
                >
                  <AlertTriangle className="w-6 h-6 text-destructive mx-auto mb-3" />
                  <p className="text-sm text-destructive font-medium mb-1">{errorMsg}</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Si le problème persiste, contactez notre équipe ou réessayez avec des identifiants différents.
                  </p>
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
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground"
                >
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
              <Shield className="w-4 h-4 text-muted-foreground/50" aria-hidden="true" />
              <span className="text-xs font-semibold text-muted-foreground/50 uppercase tracking-wider">
                Engagement UnPRO
              </span>
            </div>
            <p className="text-xs text-muted-foreground/60 max-w-md mx-auto leading-relaxed">
              UnPRO n'invente jamais les données manquantes. En cas d'ambiguïté,
              nous demandons plus de preuves plutôt que de deviner.
              Ces résultats sont estimatifs et ne constituent pas une certification légale.
            </p>
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
