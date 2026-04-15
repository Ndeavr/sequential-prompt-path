/**
 * PageEntryUnifiedIntent — Intent-based entry: voice orb + text, zero search fields.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import MainLayout from "@/layouts/MainLayout";
import HeroSectionIntentEntry from "@/components/intent-funnel/HeroSectionIntentEntry";
import ChatThreadDynamic from "@/components/intent-funnel/ChatThreadDynamic";
import CardPredictionProblem from "@/components/intent-funnel/CardPredictionProblem";
import { useDetectIntent, useFollowupQuestions, useDNAMatchScore } from "@/hooks/useIntentFunnel";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import { useAuth } from "@/hooks/useAuth";

export default function PageEntryUnifiedIntent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openAlex } = useAlexVoice();
  const { detect, intent, sessionId, loading: detectLoading } = useDetectIntent();
  const { getQuestions } = useFollowupQuestions();
  const { computeScore, loading: matchLoading } = useDNAMatchScore();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"entry" | "questions" | "matching">("entry");

  const userName = user?.user_metadata?.first_name || null;

  const handleTextSubmit = async (text: string) => {
    const result = await detect(text);
    if (result) {
      setStep("questions");
    }
  };

  const handleVoice = () => {
    openAlex("intent_funnel", "Début du funnel d'intention");
  };

  const handleAnswerQuestion = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);

    const questions = intent ? getQuestions(intent.primary) : [];
    const answeredCount = Object.keys(newAnswers).length;

    if (answeredCount >= questions.length && sessionId) {
      setStep("matching");
      computeScore(sessionId, newAnswers).then((contractors) => {
        if (contractors.length > 0) {
          navigate(`/match/${sessionId}`);
        }
      });
    }
  };

  const questions = intent ? getQuestions(intent.primary) : [];

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Décrivez votre besoin</title>
        <meta name="description" content="Décrivez votre besoin en quelques mots. Alex trouve le bon professionnel et vous donne un rendez-vous garanti." />
      </Helmet>

      <div className="relative min-h-screen">
        {step === "entry" && (
          <HeroSectionIntentEntry
            userName={userName}
            onVoice={handleVoice}
            onTextSubmit={handleTextSubmit}
            loading={detectLoading}
          />
        )}

        {step === "questions" && intent && (
          <div className="px-5 pt-12 pb-24 max-w-lg mx-auto space-y-6">
            <CardPredictionProblem intent={intent} />
            <ChatThreadDynamic
              questions={questions}
              answers={answers}
              onAnswer={handleAnswerQuestion}
            />
          </div>
        )}

        {step === "matching" && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 animate-pulse flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-primary/40 animate-ping" />
              </div>
              <p className="text-muted-foreground text-sm">Analyse en cours…</p>
              <p className="text-muted-foreground text-xs">Recherche des meilleurs professionnels</p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
