import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Sparkles, AlertTriangle, DollarSign, Wrench, Shield, Clock,
  ChevronRight, MessageCircle, HelpCircle, Lightbulb, ArrowRight,
  Loader2, BadgeCheck, ThumbsUp, ThumbsDown, Zap, BookOpen, Building2
} from "lucide-react";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAskQuestion, type StructuredAnswer } from "@/hooks/useAnswerEngine";
import AlexGlobalOrb from "@/components/alex/AlexGlobalOrb";
import AlexAutopilotProvider from "@/components/alex/AlexAutopilotProvider";

const urgencyConfig: Record<string, { color: string; bg: string; label: string; icon: typeof Clock }> = {
  low: { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", label: "Faible", icon: Clock },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Moyenne", icon: AlertTriangle },
  high: { color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20", label: "Élevée", icon: AlertTriangle },
  emergency: { color: "text-rose-500", bg: "bg-rose-500/20 border-rose-500/30", label: "Urgence", icon: Zap },
};

const POPULAR_QUESTIONS = [
  "Combien coûte une réfection de toiture au Québec?",
  "Mon condo risque-t-il une cotisation spéciale?",
  "J'ai de la condensation sur mes fenêtres, que faire?",
  "Comment isoler mon entretoit?",
  "Quand remplacer une membrane de stationnement?",
  "Combien coûte le ravalement de briques?",
  "Mon drain de fondation est bouché, que faire?",
  "Quelles subventions pour la rénovation écoénergétique?",
];

function ConfidenceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                pct >= 60 ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                "text-rose-400 border-rose-500/30 bg-rose-500/10";
  return (
    <Badge variant="outline" className={`text-[10px] ${color}`}>
      {pct >= 80 ? "Confiance élevée" : pct >= 60 ? "Confiance moyenne" : "Confiance faible"} — {pct}%
    </Badge>
  );
}

function AnswerCard({ answer }: { answer: StructuredAnswer }) {
  const urg = urgencyConfig[answer.urgency] || urgencyConfig.medium;
  const UrgIcon = urg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Short Answer */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-500/20 p-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <p className="text-base font-medium leading-relaxed">{answer.short_answer}</p>
            <div className="flex items-center gap-2 mt-3">
              <ConfidenceBadge score={answer.confidence_score} />
              <Badge variant="outline" className={`text-[10px] border ${urg.bg} ${urg.color}`}>
                <UrgIcon className="w-3 h-3 mr-1" /> {urg.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Explanation */}
      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-blue-400" /> Explication
        </h3>
        <p className="text-sm text-slate-300 leading-relaxed">{answer.explanation}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Causes */}
        {answer.causes?.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <HelpCircle className="w-4 h-4 text-amber-400" /> Causes probables
            </h3>
            <ul className="space-y-1.5">
              {answer.causes.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-amber-400 mt-0.5">•</span>{c}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Solutions */}
        {answer.solutions?.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
              <Wrench className="w-4 h-4 text-emerald-400" /> Solutions recommandées
            </h3>
            <ul className="space-y-1.5">
              {answer.solutions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-emerald-400 mt-0.5">✓</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cost */}
        {(answer.cost_min || answer.cost_max) && (
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5 text-center">
            <DollarSign className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
            <div className="text-[10px] text-slate-500 uppercase mb-1">Coût estimé</div>
            <div className="text-lg font-display font-bold text-emerald-400">
              {answer.cost_min?.toLocaleString("fr-CA")} – {answer.cost_max?.toLocaleString("fr-CA")} $
            </div>
          </div>
        )}

        {/* Professionals */}
        {answer.recommended_professionals?.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <BadgeCheck className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] text-slate-500 uppercase">Professionnels</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {answer.recommended_professionals.map((p, i) => (
                <Badge key={i} variant="outline" className="text-xs border-blue-500/20 bg-blue-500/10 text-blue-300">{p}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Preventive */}
        {answer.preventive_advice?.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-violet-400" />
              <span className="text-[10px] text-slate-500 uppercase">Prévention</span>
            </div>
            <ul className="space-y-1">
              {answer.preventive_advice.map((a, i) => (
                <li key={i} className="text-xs text-slate-400">• {a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Follow-up question */}
      {answer.follow_up_question && (
        <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-4 flex items-center gap-3">
          <MessageCircle className="w-5 h-5 text-violet-400 shrink-0" />
          <p className="text-sm text-violet-300">{answer.follow_up_question}</p>
        </div>
      )}

      {/* Next actions */}
      {answer.next_actions && answer.next_actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {answer.next_actions.map((a, i) => (
            <Button key={i} size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white border-0 text-xs gap-1.5">
              <ArrowRight className="w-3.5 h-3.5" /> {a.label}
            </Button>
          ))}
        </div>
      )}

      {/* Related questions */}
      {answer.related_questions?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" /> Questions connexes
          </h3>
          <div className="space-y-1.5">
            {answer.related_questions.map((q, i) => (
              <RelatedQuestionButton key={i} question={q} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function RelatedQuestionButton({ question }: { question: string }) {
  return (
    <button
      className="w-full text-left px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition text-sm text-slate-300 flex items-center gap-2 group"
    >
      <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-400 transition" />
      {question}
    </button>
  );
}

export default function AnswerEnginePage() {
  const [query, setQuery] = useState("");
  const [currentAnswer, setCurrentAnswer] = useState<StructuredAnswer | null>(null);
  const askQuestion = useAskQuestion();

  const handleAsk = async (q?: string) => {
    const questionText = q || query;
    if (!questionText.trim()) return;
    setQuery(questionText);
    const result = await askQuestion.mutateAsync({ question: questionText, mode: "search" });
    setCurrentAnswer(result);
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">

        {/* Hero */}
        <div className="relative px-4 md:px-8 pt-12 pb-8 text-center">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-violet-400" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
              Moteur de réponses UNPRO
            </h1>
            <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
              Posez une question sur votre propriété, vos rénovations ou votre copropriété. Réponses structurées alimentées par notre graphe de connaissances.
            </p>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto mt-8"
          >
            <form
              onSubmit={(e) => { e.preventDefault(); handleAsk(); }}
              className="relative"
            >
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: Combien coûte le remplacement d'une toiture?"
                className="bg-white/5 border-white/10 text-white pl-12 pr-24 h-14 text-base rounded-2xl"
              />
              <Button
                type="submit"
                disabled={askQuestion.isPending || !query.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-violet-600 hover:bg-violet-500 text-white border-0 rounded-xl h-10 px-5 text-sm gap-1.5"
              >
                {askQuestion.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Répondre
              </Button>
            </form>
          </motion.div>
        </div>

        {/* Content */}
        <div className="max-w-3xl mx-auto px-4 md:px-8 pb-16">
          <AnimatePresence mode="wait">
            {askQuestion.isPending && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin mx-auto mb-4" />
                <p className="text-slate-400 text-sm">Analyse en cours…</p>
              </motion.div>
            )}

            {currentAnswer && !askQuestion.isPending && (
              <AnswerCard key="answer" answer={currentAnswer} />
            )}
          </AnimatePresence>

          {/* Popular questions (shown when no answer) */}
          {!currentAnswer && !askQuestion.isPending && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h2 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-400" /> Questions populaires
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {POPULAR_QUESTIONS.map((q, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.05 }}
                    onClick={() => handleAsk(q)}
                    className="text-left px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] hover:border-violet-500/20 transition text-sm text-slate-300 flex items-center gap-2 group"
                  >
                    <Building2 className="w-4 h-4 text-slate-500 group-hover:text-violet-400 transition shrink-0" />
                    <span className="line-clamp-1">{q}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Error */}
          {askQuestion.isError && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-center text-sm text-rose-300 mt-6">
              Une erreur est survenue. Veuillez réessayer.
            </div>
          )}
        </div>

        <AlexGlobalOrb />
        <AlexAutopilotProvider />
      </div>
    </MainLayout>
  );
}
