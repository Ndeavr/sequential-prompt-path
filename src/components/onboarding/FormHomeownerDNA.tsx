/**
 * UNPRO — Homeowner DNA questionnaire (onboarding step 4)
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const QUESTIONS = [
  {
    key: "priority",
    question: "Vous cherchez surtout…",
    options: [
      { value: "prix", label: "Le meilleur prix" },
      { value: "qualite", label: "La meilleure qualité" },
      { value: "rapidite", label: "La plus grande rapidité" },
      { value: "accompagnement", label: "Un accompagnement personnalisé" },
    ],
  },
  {
    key: "communication",
    question: "Préférez-vous être contacté par…",
    options: [
      { value: "texte", label: "Texto / Message" },
      { value: "appel", label: "Appel téléphonique" },
      { value: "visite", label: "Visite rapide" },
    ],
  },
  {
    key: "complexity",
    question: "Votre projet est…",
    options: [
      { value: "simple", label: "Simple" },
      { value: "moyen", label: "Moyen" },
      { value: "complexe", label: "Complexe" },
    ],
  },
  {
    key: "results_preference",
    question: "Souhaitez-vous voir…",
    options: [
      { value: "meilleur", label: "Le meilleur choix uniquement" },
      { value: "top3", label: "Un top 3 d'options" },
    ],
  },
];

interface FormHomeownerDNAProps {
  onSave: (data: Record<string, string>) => void;
  loading?: boolean;
}

export default function FormHomeownerDNA({ onSave, loading }: FormHomeownerDNAProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);

  const q = QUESTIONS[currentQ];
  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  const selectAnswer = (value: string) => {
    const updated = { ...answers, [q.key]: value };
    setAnswers(updated);
    if (currentQ < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQ(currentQ + 1), 200);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Vos préférences</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Question {currentQ + 1} sur {QUESTIONS.length}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2">
        {QUESTIONS.map((_, i) => (
          <button
            key={i}
            onClick={() => i <= currentQ && setCurrentQ(i)}
            className={`h-2 rounded-full transition-all ${
              i === currentQ ? "w-6 bg-primary" : i < currentQ ? "w-2 bg-primary/40" : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      <motion.div
        key={q.key}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-3"
      >
        <p className="text-sm font-semibold text-foreground text-center">{q.question}</p>
        <div className="grid gap-2">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => selectAnswer(opt.value)}
              className={`p-3 rounded-xl text-sm font-medium border transition-all ${
                answers[q.key] === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {allAnswered && (
        <Button
          onClick={() => onSave(answers)}
          disabled={loading}
          className="w-full h-11 rounded-xl"
        >
          {loading ? "Enregistrement…" : "Terminer"}
        </Button>
      )}
    </div>
  );
}
