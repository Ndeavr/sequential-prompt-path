/**
 * UNPRO — Alignment Questionnaire Page
 * Step-by-step CCAI questionnaire for homeowners and contractors.
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, CheckCircle2, Users, MessageSquare, Wrench, Shield, Scale } from "lucide-react";
import { useAlignmentQuestions } from "@/hooks/useMatchingEngine";
import { useSaveAlignmentAnswers, useMyAlignmentAnswers } from "@/hooks/useCCAI";

const CATEGORY_META: Record<string, { labelFr: string; icon: React.ElementType; descFr: string }> = {
  language_communication: { labelFr: "Communication", icon: MessageSquare, descFr: "Langue, style de communication et attentes" },
  involvement_complexity: { labelFr: "Implication", icon: Users, descFr: "Votre niveau d'implication souhaité dans le projet" },
  scale_environment: { labelFr: "Environnement", icon: Wrench, descFr: "Contexte du chantier et conditions de travail" },
  trust_values: { labelFr: "Confiance", icon: Shield, descFr: "Vos priorités et valeurs face aux imprévus" },
  professional_boundaries: { labelFr: "Limites", icon: Scale, descFr: "Limites professionnelles et style relationnel" },
};

export default function AlignmentQuestionnairePage() {
  const navigate = useNavigate();
  const { data: questions, isLoading } = useAlignmentQuestions();
  const { data: existingAnswers } = useMyAlignmentAnswers();
  const saveAnswers = useSaveAlignmentAnswers();

  // Initialize from existing answers
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Pre-fill from existing answers
  useMemo(() => {
    if (existingAnswers?.length && Object.keys(answers).length === 0) {
      const prefill: Record<string, string> = {};
      existingAnswers.forEach((a: any) => {
        prefill[a.question_id] = a.answer_code;
      });
      setAnswers(prefill);
    }
  }, [existingAnswers]);

  // Group questions by category
  const grouped = useMemo(() => {
    if (!questions?.length) return [];
    const cats = new Map<string, any[]>();
    questions.forEach((q: any) => {
      const list = cats.get(q.category) || [];
      list.push(q);
      cats.set(q.category, list);
    });
    return Array.from(cats.entries()).map(([category, qs]) => ({ category, questions: qs }));
  }, [questions]);

  const currentGroup = grouped[currentIndex];
  const totalGroups = grouped.length;
  const answeredCount = Object.keys(answers).length;
  const totalQuestions = questions?.length ?? 25;
  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const handleAnswer = (questionId: string, code: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: code }));
  };

  const handleNext = () => {
    if (currentIndex < totalGroups - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleSubmit = async () => {
    if (!questions) return;
    const payload = Object.entries(answers).map(([questionId, answerCode]) => ({
      questionId,
      answerCode,
    }));

    await saveAnswers.mutateAsync(payload);
    setIsComplete(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement du questionnaire…</div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-6 space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Profil complété !</h2>
            <p className="text-muted-foreground text-sm">
              Vos réponses seront utilisées pour calculer votre compatibilité avec chaque entrepreneur.
            </p>
            <p className="text-sm text-muted-foreground">
              Score basé sur <span className="font-semibold text-foreground">{answeredCount}</span> réponses sur {totalQuestions}.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={() => navigate("/matching")} className="bg-primary text-primary-foreground">
                Voir mes recommandations
              </Button>
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Mon tableau de bord
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentGroup) return null;

  const catMeta = CATEGORY_META[currentGroup.category] ?? { labelFr: currentGroup.category, icon: Wrench, descFr: "" };
  const CatIcon = catMeta.icon;

  // Check if all questions in current group are answered
  const allGroupAnswered = currentGroup.questions.every((q: any) => !!answers[q.id]);
  const isLastGroup = currentIndex === totalGroups - 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-foreground">Questionnaire de compatibilité</h1>
            <Badge variant="outline" className="text-xs">
              {answeredCount}/{totalQuestions} réponses
            </Badge>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            {grouped.map((g, i) => (
              <button
                key={g.category}
                onClick={() => setCurrentIndex(i)}
                className={`transition-colors ${i === currentIndex ? "text-primary font-semibold" : "hover:text-foreground"}`}
              >
                {(CATEGORY_META[g.category]?.labelFr ?? g.category).slice(0, 12)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category section */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CatIcon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{catMeta.labelFr}</h2>
            <p className="text-sm text-muted-foreground">{catMeta.descFr}</p>
          </div>
          <Badge variant="secondary" className="ml-auto text-xs">
            {currentIndex + 1}/{totalGroups}
          </Badge>
        </div>

        {/* Questions */}
        {currentGroup.questions.map((q: any, qIdx: number) => {
          const options = Array.isArray(q.answer_options) ? q.answer_options : [];
          const selectedCode = answers[q.id];

          return (
            <Card key={q.id} className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-foreground">
                  {qIdx + 1}. {q.question_fr}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {options.map((opt: any) => {
                  const isSelected = selectedCode === opt.code;
                  return (
                    <button
                      key={opt.code}
                      onClick={() => handleAnswer(q.id, opt.code)}
                      className={`w-full text-left px-4 py-3 rounded-lg border text-sm transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground font-medium ring-1 ring-primary/30"
                          : "border-border/50 bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/30"
                      }`}
                    >
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{opt.code}</span>
                      {opt.label_fr}
                    </button>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 pb-8">
          <Button variant="outline" onClick={handleBack} disabled={currentIndex === 0} size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" /> Précédent
          </Button>

          <Button
            onClick={handleNext}
            disabled={!allGroupAnswered}
            size="sm"
            className="bg-primary text-primary-foreground"
          >
            {isLastGroup ? (
              <>
                Terminer <CheckCircle2 className="h-4 w-4 ml-1" />
              </>
            ) : (
              <>
                Suivant <ArrowRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
