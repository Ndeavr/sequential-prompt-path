import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, FileText, Calendar, TrendingUp, BarChart3, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import UnproIcon from "@/components/brand/UnproIcon";

interface Props { userId?: string; }

const QUICK_ACTIONS = [
  { label: "Générer article", icon: FileText },
  { label: "Planifier ma journée", icon: Calendar },
  { label: "Booster autorité", icon: TrendingUp },
  { label: "Créer étude", icon: FlaskConical },
  { label: "Analyser performance", icon: BarChart3 },
];

export default function AuthorityAlexPanel({ userId }: Props) {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [orbState, setOrbState] = useState<"idle" | "thinking">("idle");

  const handleSend = () => {
    if (!input.trim()) return;
    setOrbState("thinking");
    setTimeout(() => {
      setResponse(
        `Votre action à plus fort impact aujourd'hui : rédiger un article AEO sur "${input}". Cela ciblera directement les réponses AI et augmentera votre score d'autorité de ~3 points.`
      );
      setOrbState("idle");
      setInput("");
    }, 1500);
  };

  const handleQuickAction = (label: string) => {
    setOrbState("thinking");
    setTimeout(() => {
      const responses: Record<string, string> = {
        "Générer article": "Je recommande un article sur les tendances rénovation 2026 au Québec. Ce sujet a un potentiel AEO de 85/100.",
        "Planifier ma journée": "Voici votre plan optimal : 1) Rédiger article toiture (30min) 2) Post LinkedIn (10min) 3) Réponse Reddit (15min) 4) Optimiser SEO (20min)",
        "Booster autorité": "Actions prioritaires : obtenir 2 backlinks cette semaine et publier sur 3 nouvelles plateformes.",
        "Créer étude": "Sujet recommandé : 'Coût moyen des rénovations par quartier à Montréal 2026'. Fort potentiel de citations.",
        "Analyser performance": "Votre contenu performe 23% au-dessus de la moyenne. Points faibles : diversité des plateformes (3/7).",
      };
      setResponse(responses[label] ?? "Commande en cours de traitement...");
      setOrbState("idle");
    }, 1200);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-secondary/[0.04] backdrop-blur-xl p-5 shadow-[var(--shadow-glow)]"
    >
      <div className="flex flex-col sm:flex-row items-start gap-5">
        {/* Orb */}
        <div className="relative flex-shrink-0 self-center sm:self-start">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.3), transparent 70%)" }}
            animate={orbState === "thinking"
              ? { scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }
              : { scale: [1, 1.08, 1], opacity: [0.2, 0.35, 0.2] }
            }
            transition={{ duration: orbState === "thinking" ? 1 : 3, repeat: Infinity }}
          />
          <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary/30 bg-card/60 flex items-center justify-center">
            <img src={logo} alt="Alex" className="h-10 w-10 object-contain" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground font-display">Alex AI</h2>
            <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted/50 border border-border/40">
              {orbState === "thinking" ? "Réflexion..." : "Prêt"}
            </span>
          </div>

          {/* Response */}
          <AnimatePresence mode="wait">
            {response && (
              <motion.div
                key={response}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-sm text-foreground/80 bg-card/50 rounded-xl border border-border/30 p-3"
              >
                {response}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => handleQuickAction(a.label)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground bg-muted/40 border border-border/30 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
              >
                <a.icon className="h-3 w-3" />
                {a.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Demandez à Alex quoi faire ensuite..."
              className="flex-1 rounded-xl border border-border/40 bg-card/40 backdrop-blur-sm px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
            />
            <Button
              onClick={handleSend}
              size="icon"
              className="shrink-0 rounded-xl bg-primary hover:bg-primary/90"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
