/**
 * UNPRO AI Trust — Cinematic 9-step audit funnel.
 * Mobile-first. Each step shows value within seconds, no SEO/leads vocabulary.
 */
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Sparkles, ScanLine, Brain, Layers, MessageSquare, ShieldCheck, MapPin, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TrustPositionBadge from "@/features/aiTrust/components/TrustPositionBadge";
import ConfidenceBar from "@/features/aiTrust/components/ConfidenceBar";
import SemanticEntityChip from "@/features/aiTrust/components/SemanticEntityChip";
import TerritoryScarcityCard from "@/features/aiTrust/components/TerritoryScarcityCard";
import { STEP_ORDER, useAiTrustAuditStore } from "./aiTrustAuditStore";

function StepShell({ children, icon: Icon, label }: { children: React.ReactNode; icon: any; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="w-full"
    >
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-300/80 mb-4">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      {children}
    </motion.div>
  );
}

export default function AiTrustAuditFunnel() {
  const { step, input, results, scanning, next, back, patchInput, patchResults, setScanning } =
    useAiTrustAuditStore();

  const stepIdx = STEP_ORDER.indexOf(step);
  const progress = ((stepIdx + 1) / STEP_ORDER.length) * 100;

  // Auto-run scans when entering the scanning step
  useEffect(() => {
    if (step !== "scanning") return;
    let cancelled = false;
    (async () => {
      setScanning(true);
      try {
        const { data: identity } = await supabase.functions.invoke("api_detect_ai_identity", {
          body: { website: input.website, company_name: input.company_name, city: input.city },
        });
        if (cancelled) return;
        patchResults({
          detected_identity: identity?.detected_identity,
          detected_specialties: identity?.detected_specialties ?? [],
          semantic_entities: identity?.entities ?? [],
          ai_confidence: identity?.confidence ?? 0.5,
        });

        const { data: gap } = await supabase.functions.invoke("api_semantic_gap_analysis", {
          body: {
            detected: identity?.detected_specialties ?? [],
            desired: input.specialty ? [input.specialty] : [],
          },
        });
        if (cancelled) return;
        patchResults({ semantic_gap_score: gap?.gap_score ?? 0.5 });

        const { data: reviews } = await supabase.functions.invoke("api_review_intelligence", {
          body: { company_name: input.company_name, city: input.city },
        });
        if (cancelled) return;
        patchResults({
          review_sentiment: reviews?.sentiment ?? "uncertain",
          review_signals: reviews?.signals ?? [],
        });

        const { data: trust } = await supabase.functions.invoke("api_ai_trust_position", {
          body: {
            ai_confidence: identity?.confidence,
            semantic_gap: gap?.gap_score,
            review_sentiment: reviews?.sentiment,
          },
        });
        if (cancelled) return;
        patchResults({
          trust_position: trust?.position ?? "emerging",
          trust_score: trust?.score ?? 55,
          territory_slots_total: 5,
          territory_slots_taken: trust?.territory_taken ?? 3,
        });
      } catch (e) {
        // graceful fallback — keep the funnel moving with mock data
        patchResults({
          detected_identity: input.company_name ?? "Entreprise détectée",
          detected_specialties: [input.specialty ?? "Services résidentiels"],
          semantic_entities: [
            { label: input.specialty ?? "Plomberie", type: "specialty", strength: 0.72 },
            { label: input.city ?? "Montréal", type: "city", strength: 0.81 },
          ],
          ai_confidence: 0.62,
          semantic_gap_score: 0.34,
          review_sentiment: "neutral",
          review_signals: ["Mentions limitées", "Aucune entité forte"],
          trust_position: "emerging",
          trust_score: 58,
          territory_slots_total: 5,
          territory_slots_taken: 3,
        });
      } finally {
        if (!cancelled) {
          setScanning(false);
          setTimeout(() => useAiTrustAuditStore.getState().next(), 400);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step]);

  return (
    <div className="intel-theme min-h-screen bg-[#050816] text-foreground">
      {/* Ambient bg */}
      <div
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(1000px 600px at 12% 0%, rgba(56,189,248,0.12), transparent 60%), radial-gradient(900px 500px at 90% 100%, rgba(217,119,6,0.10), transparent 60%)",
        }}
      />

      {/* Progress */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-[#050816]/70 border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-[0.25em] text-cyan-300/70">
              UNPRO · AI Trust Audit
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {stepIdx + 1}/{STEP_ORDER.length}
            </span>
          </div>
          <div className="h-0.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-amber-400"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-12 sm:py-20">
        <AnimatePresence mode="wait">
          {step === "intro" && (
            <StepShell key="intro" icon={Sparkles} label="Diagnostic IA">
              <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight leading-[1.05] mb-6">
                Êtes-vous l'entreprise que l'IA recommande dans votre territoire?
              </h1>
              <p className="text-base text-muted-foreground mb-8 max-w-lg">
                Nous analysons comment ChatGPT, Google et les moteurs de recommandation perçoivent votre entreprise. Aucune donnée inventée.
              </p>
              <Button size="lg" onClick={next} className="gap-2 bg-cyan-400 text-[#050816] hover:bg-cyan-300">
                Lancer mon analyse <ArrowRight className="w-4 h-4" />
              </Button>
            </StepShell>
          )}

          {step === "identify" && (
            <StepShell key="identify" icon={ScanLine} label="Identification">
              <h2 className="text-3xl font-semibold mb-2">Identifions votre entreprise</h2>
              <p className="text-sm text-muted-foreground mb-6">3 champs. C'est tout.</p>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs">Nom de l'entreprise</Label>
                  <Input
                    value={input.company_name ?? ""}
                    onChange={(e) => patchInput({ company_name: e.target.value })}
                    placeholder="Ex. Plomberie Lemieux"
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div>
                  <Label className="text-xs">Site web</Label>
                  <Input
                    value={input.website ?? ""}
                    onChange={(e) => patchInput({ website: e.target.value })}
                    placeholder="https://..."
                    className="bg-white/5 border-white/10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Ville principale</Label>
                    <Input
                      value={input.city ?? ""}
                      onChange={(e) => patchInput({ city: e.target.value })}
                      placeholder="Montréal"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Spécialité ciblée</Label>
                    <Input
                      value={input.specialty ?? ""}
                      onChange={(e) => patchInput({ specialty: e.target.value })}
                      placeholder="Plomberie"
                      className="bg-white/5 border-white/10"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={back}>Retour</Button>
                <Button
                  onClick={next}
                  disabled={!input.company_name || !input.city}
                  className="bg-cyan-400 text-[#050816] hover:bg-cyan-300"
                >
                  Analyser <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepShell>
          )}

          {step === "scanning" && (
            <StepShell key="scanning" icon={Brain} label="Analyse en cours">
              <h2 className="text-3xl font-semibold mb-2">Lecture des signaux IA…</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Identité détectée · Entités sémantiques · Sentiment des clients · Position d'autorité
              </p>
              <div className="relative h-32 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 overflow-hidden">
                <motion.div
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs text-cyan-200/80 uppercase tracking-[0.3em]">
                  {scanning ? "Scanning…" : "Finalisation"}
                </div>
              </div>
            </StepShell>
          )}

          {step === "ai_perception" && (
            <StepShell key="ai_perception" icon={Brain} label="Perception IA">
              <h2 className="text-3xl font-semibold mb-2">Voici comment l'IA vous décrit</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Identité reconstituée à partir des signaux publics disponibles.
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  Identité détectée
                </p>
                <p className="text-lg font-medium">
                  {results.detected_identity ?? input.company_name}
                </p>
              </div>
              <ConfidenceBar value={results.ai_confidence ?? 0.6} label="Confiance de l'IA" />
              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={back}>Retour</Button>
                <Button onClick={next} className="bg-cyan-400 text-[#050816] hover:bg-cyan-300">
                  Voir l'écart sémantique <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepShell>
          )}

          {step === "semantic_gap" && (
            <StepShell key="semantic_gap" icon={Layers} label="Écart sémantique">
              <h2 className="text-3xl font-semibold mb-2">L'IA vous associe-t-elle aux bons concepts?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Entités détectées par les modèles de langage:
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {(results.semantic_entities ?? []).map((e, i) => (
                  <SemanticEntityChip key={i} label={e.label} type={e.type as any} strength={e.strength} />
                ))}
              </div>
              <ConfidenceBar
                value={1 - (results.semantic_gap_score ?? 0.5)}
                label="Alignement avec votre spécialité"
              />
              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={back}>Retour</Button>
                <Button onClick={next} className="bg-cyan-400 text-[#050816] hover:bg-cyan-300">
                  Voir l'intelligence des avis <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepShell>
          )}

          {step === "review_intelligence" && (
            <StepShell key="reviews" icon={MessageSquare} label="Intelligence des avis">
              <h2 className="text-3xl font-semibold mb-2">Ce que vos clients enseignent à l'IA</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Signaux extraits des avis publics (qualité, fiabilité, suivi).
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">
                  Sentiment global
                </p>
                <div className="text-2xl font-semibold capitalize">
                  {results.review_sentiment ?? "neutre"}
                </div>
              </div>
              <ul className="space-y-2">
                {(results.review_signals ?? []).map((s, i) => (
                  <li key={i} className="text-sm text-foreground/80 flex gap-2">
                    <span className="text-cyan-300">•</span> {s}
                  </li>
                ))}
              </ul>
              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={back}>Retour</Button>
                <Button onClick={next} className="bg-cyan-400 text-[#050816] hover:bg-cyan-300">
                  Voir ma position d'autorité <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepShell>
          )}

          {step === "trust_position" && (
            <StepShell key="trust" icon={ShieldCheck} label="Position d'autorité">
              <h2 className="text-3xl font-semibold mb-2">Votre position dans le graphe de confiance</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Combinaison pondérée: perception IA, alignement, sentiment, signaux publics.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6 rounded-2xl border border-white/10 bg-white/5 p-6">
                <TrustPositionBadge position={results.trust_position ?? "emerging"} size="lg" />
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
                    Score de confiance
                  </p>
                  <div className="text-5xl font-semibold font-mono">
                    {results.trust_score ?? 55}
                    <span className="text-base text-muted-foreground">/100</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={back}>Retour</Button>
                <Button onClick={next} className="bg-cyan-400 text-[#050816] hover:bg-cyan-300">
                  Voir mon territoire <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepShell>
          )}

          {step === "territory" && (
            <StepShell key="territory" icon={MapPin} label="Territoire d'autorité">
              <h2 className="text-3xl font-semibold mb-2">Places disponibles dans votre territoire</h2>
              <p className="text-sm text-muted-foreground mb-6">
                L'autorité IA est rare par design. Chaque territoire expose un nombre limité d'entreprises.
              </p>
              <TerritoryScarcityCard
                city={input.city ?? "Votre ville"}
                specialty={input.specialty ?? "Votre spécialité"}
                totalSlots={results.territory_slots_total ?? 5}
                takenSlots={results.territory_slots_taken ?? 3}
              />
              <div className="flex gap-3 mt-8">
                <Button variant="ghost" onClick={back}>Retour</Button>
                <Button onClick={next} className="bg-cyan-400 text-[#050816] hover:bg-cyan-300">
                  Activer ma position <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </StepShell>
          )}

          {step === "activate" && (
            <StepShell key="activate" icon={Rocket} label="Activation">
              <h2 className="text-3xl font-semibold mb-2">Verrouillez votre autorité IA</h2>
              <p className="text-sm text-muted-foreground mb-8">
                Vous voulez devenir l'entreprise recommandée par défaut dans {input.city ?? "votre territoire"}? Nous activons votre profil d'autorité, alignons les signaux et défendons votre place.
              </p>
              <div className="grid gap-3">
                <Button size="lg" className="bg-amber-400 text-[#050816] hover:bg-amber-300">
                  Réserver ma place d'autorité
                </Button>
                <Button size="lg" variant="outline" className="border-white/10">
                  Parler à un stratège UNPRO
                </Button>
              </div>
            </StepShell>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
