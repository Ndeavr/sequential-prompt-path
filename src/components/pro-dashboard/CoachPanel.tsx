/**
 * UNPRO — AI Coach Panel (Dashboard Home Widget)
 */
import { motion } from "framer-motion";
import { Brain, ChevronRight, Sparkles, Target, TrendingUp, Shield, Zap } from "lucide-react";
import { useContractorCoach } from "@/hooks/useContractorCoach";
import { useState } from "react";

const QUICK_ACTIONS = [
  { label: "Mes 3 meilleurs gestes", prompt: "Quels sont mes 3 meilleurs gestes pour améliorer mon profil et recevoir plus de rendez-vous ?", icon: Target },
  { label: "Pourquoi je perds des leads ?", prompt: "Pourquoi est-ce que je perds des leads ? Quels sont mes principaux freins actuels ?", icon: TrendingUp },
  { label: "Débloquer un badge", prompt: "Quel badge suis-je le plus proche de débloquer et que manque-t-il ?", icon: Shield },
  { label: "Mon forfait est-il le bon ?", prompt: "Est-ce qu'un forfait supérieur m'aiderait vraiment en ce moment ou est-ce que mon profil est le vrai frein ?", icon: Zap },
];

export default function CoachPanel() {
  const { contractorContext } = useContractorCoach();
  const [showChat, setShowChat] = useState(false);

  const ctx = contractorContext;
  const completeness = ctx?.completeness ?? 0;
  const aipp = ctx?.aipp_score ?? 0;

  // Determine main priority
  let mainPriority = "Complétez votre profil pour augmenter votre visibilité.";
  if (completeness >= 80 && aipp < 50) {
    mainPriority = "Améliorez votre score AIPP pour monter dans les résultats.";
  } else if (completeness >= 80 && aipp >= 50) {
    mainPriority = "Votre profil est solide. Concentrez-vous sur les avis et la réactivité.";
  } else if (ctx?.missing_fields?.includes("spécialité")) {
    mainPriority = "Précisez vos spécialités exactes pour améliorer votre admissibilité.";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-secondary/[0.03] backdrop-blur-sm p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Votre coach IA</h3>
            <p className="text-[10px] text-muted-foreground">Des conseils concrets pour progresser</p>
          </div>
        </div>
        <button
          onClick={() => setShowChat(true)}
          className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:underline"
        >
          Poser une question <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main Priority */}
      <div className="p-3 rounded-lg bg-background/60 border border-border/30">
        <div className="flex items-start gap-2">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Votre priorité du moment</p>
            <p className="text-sm text-foreground leading-snug">{mainPriority}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => setShowChat(true)}
            className="flex items-center gap-2 p-2.5 rounded-lg bg-background/40 border border-border/20 hover:border-primary/30 hover:bg-primary/[0.04] transition-all text-left group"
          >
            <action.icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
              {action.label}
            </span>
          </button>
        ))}
      </div>

      {/* Chat Modal */}
      {showChat && <CoachChatModal onClose={() => setShowChat(false)} />}
    </motion.div>
  );
}

function CoachChatModal({ onClose }: { onClose: () => void }) {
  const { messages, isLoading, error, sendMessage, clearChat } = useContractorCoach();
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Coach IA UNPRO</h2>
            <p className="text-[10px] text-muted-foreground">Votre coach stratégique</p>
          </div>
        </div>
        <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
          Fermer
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Demandez-moi n'importe quoi</p>
              <p className="text-xs text-muted-foreground mt-1">Score, badges, leads manqués, forfait, profil…</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => sendMessage(a.prompt)}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/50 text-foreground rounded-bl-md border border-border/30"
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-muted/50 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2 inline-block">{error}</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/30">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Posez votre question au coach…"
            className="flex-1 bg-muted/30 border border-border/30 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-semibold disabled:opacity-40 transition-opacity"
          >
            Envoyer
          </button>
        </div>
      </div>
    </motion.div>
  );
}
