/**
 * SectionInstantMatch — Photo-first instant match with live AI analysis.
 * Entry points: Photo, Voice, Text. Results appear inline.
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Mic, MessageSquare, Sparkles, ArrowRight, CheckCircle2, Star, MapPin, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { Link } from "react-router-dom";

type MatchState = "idle" | "analyzing" | "matched";

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
  const [matchState, setMatchState] = useState<MatchState>("idle");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

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
        // Simulate AI analysis
        setTimeout(() => setMatchState("matched"), 2500);
      }
    };
    input.click();
  }, []);

  const handleVoiceMatch = useCallback(() => {
    openAlex("diagnostic");
  }, [openAlex]);

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
            </motion.div>
          )}

          {matchState === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card rounded-3xl p-6 text-center space-y-5"
            >
              {photoPreview && (
                <div className="mx-auto w-48 h-48 rounded-2xl overflow-hidden border border-border/40">
                  <img src={photoPreview} alt="Photo du projet" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="space-y-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="mx-auto h-10 w-10 rounded-full border-2 border-primary border-t-transparent"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">Analyse en cours…</p>
                  <motion.div className="space-y-1">
                    {["Détection du problème", "Analyse de la zone", "Recherche du meilleur pro"].map((step, i) => (
                      <motion.p
                        key={step}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.6 }}
                        className="text-xs text-muted-foreground flex items-center gap-2 justify-center"
                      >
                        <Sparkles className="h-3 w-3 text-primary" />
                        {step}
                      </motion.p>
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {matchState === "matched" && (
            <motion.div
              key="matched"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className="space-y-4"
            >
              {/* Alex bubble */}
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

              {/* Match Card */}
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

                {/* Next available slot */}
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 px-3 py-2">
                  <Clock className="h-4 w-4 text-success" />
                  <p className="text-sm font-medium text-foreground">
                    Prochain créneau : <span className="text-success font-bold">{MOCK_MATCH.nextSlot}</span>
                  </p>
                </div>

                {/* CTAs */}
                <div className="mt-4 flex gap-2.5">
                  <Link
                    to={`/pro/${MOCK_MATCH.slug}`}
                    className="flex-1 h-11 rounded-xl flex items-center justify-center text-xs font-bold bg-card border border-border text-foreground hover:bg-muted/50 transition-all"
                  >
                    Voir le profil
                  </Link>
                  <Button
                    onClick={() => {}}
                    className="flex-1 h-11 rounded-xl gap-1.5 text-xs font-bold"
                  >
                    Réserver maintenant <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Reset */}
              <div className="text-center">
                <button
                  onClick={() => { setMatchState("idle"); setPhotoPreview(null); }}
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
