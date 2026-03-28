/**
 * /match — Owner Instant Match Entry Point
 * Photo upload, text input, or voice → Alex guided flow
 */
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, Mic, Send, Upload, Sparkles, ArrowRight, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

export default function PageOwnerMatch() {
  const navigate = useNavigate();
  const { openAlex } = useAlexVoice();
  const [textInput, setTextInput] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createSession = async (entryMode: "text" | "photo" | "voice", content?: string) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("owner_match_sessions")
        .insert({ entry_mode: entryMode })
        .select("id, session_token")
        .single();

      if (error) throw error;

      if (content && entryMode === "text") {
        await supabase.from("owner_match_inputs").insert({
          session_id: data.id,
          input_type: "text",
          content,
        });
      }

      await supabase.from("owner_match_events").insert({
        session_id: data.id,
        event_type: "session_started",
        metadata: { entry_mode: entryMode },
      });

      // For now, navigate to Alex chat with context
      navigate(`/alex?match=${data.session_token}`);
    } catch (err) {
      toast.error("Erreur lors de la création de la session");
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    createSession("text", textInput.trim());
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Create session first, then upload photo
    createSession("photo");
  };

  return (
    <>
      <Helmet>
        <title>Trouvez la bonne solution — UNPRO</title>
        <meta name="description" content="Prenez une photo, décrivez votre projet ou parlez avec Alex. Trouvez rapidement la bonne direction pour votre propriété." />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        {/* Hero */}
        <section className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-2xl w-full text-center">
            <motion.h1
              variants={fadeUp} initial="hidden" animate="visible"
              className="font-display text-4xl sm:text-5xl font-bold text-foreground leading-tight mb-4"
            >
              Take a photo.
              <br />
              <span className="text-primary">Get the right solution.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.1 }}
              className="text-lg text-muted-foreground mb-10 max-w-lg mx-auto"
            >
              Parlez avec Alex ou téléversez votre projet. Une photo peut remplacer mille mots.
            </motion.p>

            {/* Photo Upload - Primary CTA */}
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={handlePhotoClick}
                disabled={isCreating}
                className="w-full max-w-md mx-auto flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 transition hover:border-primary/60 hover:bg-primary/10"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Téléverser une photo</p>
                  <p className="text-sm text-muted-foreground">ou prendre une photo maintenant</p>
                </div>
              </button>
            </motion.div>

            {/* Quick text input */}
            <motion.form
              onSubmit={handleTextSubmit}
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }}
              className="flex gap-2 max-w-md mx-auto mb-6"
            >
              <Input
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Isolation entretoit, fuite plafond, refaire cuisine..."
                className="rounded-xl text-base"
                disabled={isCreating}
              />
              <Button type="submit" size="icon" className="rounded-xl shrink-0" disabled={isCreating || !textInput.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </motion.form>

            {/* Voice CTA */}
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.4 }}
            >
              <Button
                variant="outline"
                size="lg"
                className="gap-2 rounded-xl"
                onClick={() => openAlex("owner_match")}
                disabled={isCreating}
              >
                <Mic className="h-5 w-5" />
                Parler à Alex
              </Button>
            </motion.div>

            {/* Trust bar */}
            <motion.div
              variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.5 }}
              className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-primary" /> Entrepreneurs vérifiés</span>
              <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-primary" /> Réponse en secondes</span>
              <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> Propulsé par l'IA</span>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
}
