/**
 * CardEntrepreneurEntryAlex — Premium entry point for entrepreneurs
 * on fallback/public pages. Glass morphism + subtle gradient.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Briefcase, ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import PanelAlexEntrepreneurTransition from "./PanelAlexEntrepreneurTransition";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  sourcePage?: string;
}

export default function CardEntrepreneurEntryAlex({ sourcePage = "fallback" }: Props) {
  const navigate = useNavigate();
  const [showTransition, setShowTransition] = useState(false);

  const logEntry = async (action: "click" | "view") => {
    try {
      await supabase.from("entrepreneur_entry_logs").insert({
        source_page: sourcePage,
        action,
        session_id: crypto.randomUUID(),
      });
    } catch {}
  };

  const handlePrimary = async () => {
    await logEntry("click");
    setShowTransition(true);
  };

  const handleSecondary = () => {
    navigate("/entrepreneurs/comment-ca-marche");
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
        className="w-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-accent/[0.06] backdrop-blur-sm p-5 space-y-4 group hover:border-primary/40 hover:shadow-[0_0_24px_-6px_hsl(var(--primary)/0.15)] transition-all duration-300"
      >
        {/* Icon + Title */}
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
            <Briefcase className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1 min-w-0">
            <h3 className="text-[0.9375rem] font-semibold text-foreground leading-tight">
              Vous êtes entrepreneur ?
            </h3>
            <p className="text-sm text-muted-foreground leading-snug">
              Obtenez des rendez-vous qualifiés avec l'IA.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-2">
          <Button
            onClick={handlePrimary}
            size="lg"
            className="w-full gap-2 font-semibold"
          >
            Créer mon profil IA
            <ArrowRight className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSecondary}
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-muted-foreground hover:text-foreground"
          >
            <Play className="w-3.5 h-3.5" />
            Voir comment ça fonctionne
          </Button>
        </div>
      </motion.div>

      {showTransition && (
        <PanelAlexEntrepreneurTransition
          onClose={() => setShowTransition(false)}
          sourcePage={sourcePage}
        />
      )}
    </>
  );
}
