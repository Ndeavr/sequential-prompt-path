/**
 * UNPRO — Contractor DNA Form (onboarding)
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const QUESTIONS = [
  {
    key: "project_sizes",
    question: "Vous préférez des projets…",
    options: [
      { value: "small", label: "Petits (< 5 000 $)" },
      { value: "medium", label: "Moyens (5K – 25K $)" },
      { value: "large", label: "Grands (25K – 100K $)" },
      { value: "xlarge", label: "Très grands (100K+ $)" },
    ],
    multi: true,
  },
  {
    key: "communication_style",
    question: "Votre style de communication…",
    options: [
      { value: "minimal", label: "Essentiel seulement" },
      { value: "standard", label: "Régulier" },
      { value: "detailed", label: "Très détaillé" },
    ],
  },
  {
    key: "service_speed",
    question: "Votre rapidité d'exécution…",
    options: [
      { value: "fast", label: "Rapide" },
      { value: "standard", label: "Normal" },
      { value: "meticulous", label: "Minutieux" },
    ],
  },
  {
    key: "premium_positioning",
    question: "Votre positionnement prix…",
    options: [
      { value: "economique", label: "Économique" },
      { value: "standard", label: "Standard" },
      { value: "premium", label: "Premium" },
    ],
  },
  {
    key: "urgency_capacity",
    question: "Acceptez-vous les urgences ?",
    options: [
      { value: "yes", label: "Oui, toujours" },
      { value: "sometimes", label: "Parfois" },
      { value: "no", label: "Non" },
    ],
  },
];

interface FormContractorDNAProps {
  onSave: (data: Record<string, string | string[]>) => void;
  loading?: boolean;
}

export default function FormContractorDNA({ onSave, loading }: FormContractorDNAProps) {
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentQ, setCurrentQ] = useState(0);

  const q = QUESTIONS[currentQ];
  const allAnswered = Object.keys(answers).length === QUESTIONS.length;

  const selectAnswer = (value: string) => {
    if (q.multi) {
      const current = (answers[q.key] as string[]) || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      setAnswers(prev => ({ ...prev, [q.key]: updated }));
    } else {
      setAnswers(prev => ({ ...prev, [q.key]: value }));
      if (currentQ < QUESTIONS.length - 1) {
        setTimeout(() => setCurrentQ(currentQ + 1), 200);
      }
    }
  };

  const isSelected = (value: string) => {
    const a = answers[q.key];
    if (Array.isArray(a)) return a.includes(value);
    return a === value;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold text-foreground">Votre ADN entrepreneur</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Question {currentQ + 1} sur {QUESTIONS.length}
        </p>
      </div>

      <div className="flex justify-center gap-2">
        {QUESTIONS.map((_, i) => (
          <div
            key={i}
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
        {q.multi && <p className="text-xs text-muted-foreground text-center">Plusieurs choix possibles</p>}
        <div className="grid gap-2">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => selectAnswer(opt.value)}
              className={`p-3 rounded-xl text-sm font-medium border transition-all ${
                isSelected(opt.value)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {q.multi && (answers[q.key] as string[])?.length > 0 && currentQ < QUESTIONS.length - 1 && (
          <Button
            variant="ghost"
            onClick={() => setCurrentQ(currentQ + 1)}
            className="w-full text-sm"
          >
            Suivant →
          </Button>
        )}
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
