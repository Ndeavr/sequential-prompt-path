/**
 * SectionInstantMatch — Photo-first instant match with contextual Alex prompts.
 * Entry points: Photo, Voice, Text, Pills.
 * After photo/pill, Alex shows a contextual question with quick replies.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, MessageSquare, Sparkles, ArrowRight, CheckCircle2, Star, MapPin, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useNavigate, Link } from "react-router-dom";
import { resolveContextPrompt, detectRoomFromTags, detectIssueFromTags, FLOW_ROUTES, type DetectedContext, type TriggerType } from "@/services/alexContextPromptEngine";
import PanelAlexMessageContextual from "@/components/alex/PanelAlexMessageContextual";
import CardAlexSuggestedNextActions from "@/components/alex/CardAlexSuggestedNextActions";

type MatchState = "idle" | "analyzing" | "contextual" | "matched" | "next_actions";

const PILLS = [
  { key: "toiture", emoji: "🏠", label: "Toiture" },
  { key: "cuisine", emoji: "🍳", label: "Cuisine" },
  { key: "plomberie", emoji: "🔧", label: "Plomberie" },
  { key: "salle_de_bain", emoji: "🚿", label: "Salle de bain" },
  { key: "soumissions", emoji: "📄", label: "Mes soumissions" },
  { key: "passeport", emoji: "📋", label: "Passeport Maison" },
];

const MOCK_MATCH = {
  name: "Toitures Laval Pro",
  score: 94,
  location: "Laval · Rive-Nord",
  badge: "Recommandé UNPRO",
  specialty: "Toiture & bardeaux",
  rating: 4.9,
  reviews: 312,
  nextSlot: "Demain, 10h",
  slug: "toitures-laval-pro",
};

export default function SectionInstantMatch() {
  const { openAlex } = useAlexVoice();
  const navigate = useNavigate();
  const [matchState, setMatchState] = useState<MatchState>("idle");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const currentPrompt = useState(() =>
    resolveContextPrompt({ triggerType: "cold" })
  );
  const [prompt, setPrompt] = currentPrompt;
  const [activeFlow, setActiveFlow] = useState("general");

  // ── Photo capture ──
  const handlePhotoCapture = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setPhotoPreview(URL.createObjectURL(file));
        setMatchState("analyzing");

        // Simulate image analysis → contextual prompt
        setTimeout(() => {
          const mockContext: DetectedContext = {
            room: "cuisine",
            style: "ancien",
            confidence: 0.82,
            suggestedIntent: "design",
          };
          const resolved = resolveContextPrompt({
            triggerType: "photo",
            imageContext: mockContext,
          });
          setPrompt(resolved);
          setActiveFlow(resolved.nextFlow || "general");
          setMatchState("contextual");
        }, 2000);
      }
    };
    input.click();
  }, []);

  // ── Pill click ──
  const handlePillClick = useCallback((pillKey: string) => {
    const resolved = resolveContextPrompt({
      triggerType: "pill",
      pillKey,
    });
    setPrompt(resolved);
    setActiveFlow(resolved.nextFlow || "general");
    setMatchState("contextual");
  }, []);

  // ── Quick reply ──
  const handleQuickReply = useCallback((reply: string) => {
    // Log and show next actions
    setMatchState("next_actions");
  }, [activeFlow]);

  // ── Voice ──
  const handleVoiceMatch = useCallback(() => {
    openAlex("diagnostic");
  }, [openAlex]);

  // ── Navigate to flow ──
  const handleFlowAction = useCallback((route: string) => {
    navigate(route);
  }, [navigate]);

  // ── Reset ──
  const handleDismiss = useCallback(() => {
    setMatchState("idle");
    setPhotoPreview(null);
  }, []);

  return (
    <section className="px-5 py-14 md:py-20">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <h2 className="font-display text-[22px] sm:text-[28px] md:text-[36px] font-bold text-foreground leading-tight">
            Match <span className="text-primary">instantané</span>
          </h2>
          <p className="mt-2 text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Photo, voix ou texte — trouvez le bon professionnel en secondes.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ═══ IDLE STATE ═══ */}
          {matchState === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Primary: Photo */}
              <button
                onClick={handlePhotoCapture}
                className="w-full glass-card rounded-2xl p-5 flex items-center gap-4 text-left hover:shadow-lg transition-all group"
              >
                <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-base font-bold text-foreground">Prenez une photo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">L'IA détecte le problème et trouve le bon pro.</p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>

              {/* Secondary: Voice + Text */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleVoiceMatch}
                  className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-lg transition-all group"
                >
                  <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <Mic className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Parler à Alex</p>
                  <p className="text-[10px] text-muted-foreground">Décrivez par la voix</p>
                </button>

                <Link
                  to="/describe-project"
                  className="glass-card rounded-2xl p-4 flex flex-col items-center gap-2 text-center hover:shadow-lg transition-all group"
                >
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                    <MessageSquare className="h-5 w-5 text-secondary" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Écrire</p>
                  <p className="text-[10px] text-muted-foreground">Décrivez par texte</p>
                </Link>
              </div>

              {/* Pills */}
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                {PILLS.map((pill, i) => (
                  <motion.button
                    key={pill.key}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    onClick={() => handlePillClick(pill.key)}
                    className="text-xs font-medium px-3 py-2 rounded-full border border-border/60 bg-card/80 text-foreground hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-95"
                  >
                    {pill.emoji} {pill.label}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ═══ ANALYZING STATE ═══ */}
          {matchState === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              {photoPreview && (
                <div className="mx-auto w-48 h-48 rounded-2xl overflow-hidden border border-border/40">
                  <img src={photoPreview} alt="Photo du projet" className="w-full h-full object-cover" />
                </div>
              )}
              <PanelAlexMessageContextual
                prompt={prompt}
                isAnalyzing={true}
                onQuickReply={() => {}}
                onDismiss={handleDismiss}
              />
            </motion.div>
          )}

          {/* ═══ CONTEXTUAL PROMPT STATE ═══ */}
          {matchState === "contextual" && (
            <motion.div
              key="contextual"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {photoPreview && (
                <div className="mx-auto w-40 h-40 rounded-2xl overflow-hidden border border-border/40">
                  <img src={photoPreview} alt="Photo du projet" className="w-full h-full object-cover" />
                </div>
              )}
              <PanelAlexMessageContextual
                prompt={prompt}
                onQuickReply={handleQuickReply}
                onDismiss={handleDismiss}
                onUploadPhoto={handlePhotoCapture}
              />
            </motion.div>
          )}

          {/* ═══ NEXT ACTIONS STATE ═══ */}
          {matchState === "next_actions" && (
            <motion.div
              key="next_actions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <CardAlexSuggestedNextActions
                flow={activeFlow}
                onAction={handleFlowAction}
              />
              <div className="text-center pt-2">
                <button
                  onClick={handleDismiss}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Recommencer
                </button>
              </div>
            </motion.div>
          )}

          {/* ═══ MATCHED STATE (kept for direct match flow) ═══ */}
          {matchState === "matched" && (
            <motion.div
              key="matched"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 max-w-md">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="rounded-2xl rounded-tl-md px-4 py-2.5 glass-card">
                  <p className="text-sm font-medium text-foreground">
                    Problème détecté : <span className="text-primary">infiltration toiture</span>. Voici votre meilleur match.
                  </p>
                </div>
              </div>

              <div className="glass-card rounded-3xl p-5 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0 border border-primary/20">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-bold text-foreground">{MOCK_MATCH.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> {MOCK_MATCH.badge}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-warning bg-warning/10 px-2 py-0.5 rounded-full">
                        {MOCK_MATCH.score}/100
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {MOCK_MATCH.location}</span>
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-warning" /> {MOCK_MATCH.rating} ({MOCK_MATCH.reviews})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-3 py-2">
                  <Clock className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium text-foreground">
                    Prochain créneau : <span className="text-success font-bold">{MOCK_MATCH.nextSlot}</span>
                  </p>
                </div>

                <div className="mt-4 flex gap-2.5">
                  <Link
                    to={`/pro/${MOCK_MATCH.slug}`}
                    className="flex-1 h-11 rounded-xl flex items-center justify-center text-xs font-bold bg-card border border-border text-foreground hover:bg-muted/50 transition-all"
                  >
                    Voir le profil
                  </Link>
                  <Button className="flex-1 h-11 rounded-xl gap-1.5 text-xs font-bold">
                    Réserver maintenant <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <button
                  onClick={handleDismiss}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Essayer avec un autre projet
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
