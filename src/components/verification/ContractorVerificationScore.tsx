/**
 * ContractorVerificationScore — Main circular gauge for Identity Confidence Score.
 * Animated ring fill + count-up + interpretation text.
 */
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  score: number;
  loading?: boolean;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(152 50% 55%)";
  if (score >= 40) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
}

function getInterpretation(score: number): { title: string; subtitle: string } {
  if (score >= 80) return {
    title: "Correspondance forte détectée",
    subtitle: "Les données publiques pointent vers la même entreprise.",
  };
  if (score >= 60) return {
    title: "Correspondance probable",
    subtitle: "Certaines validations restent basées sur des signaux publics.",
  };
  if (score >= 40) return {
    title: "Correspondance incertaine",
    subtitle: "Certaines informations manquent pour confirmer l'identité.",
  };
  return {
    title: "Correspondance non confirmée",
    subtitle: "Impossible de confirmer l'entreprise avec les données actuelles.",
  };
}

export default function ContractorVerificationScore({ score, loading }: Props) {
  const size = 160;
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const progress = (clamped / 100) * circumference;
  const color = getScoreColor(clamped);
  const interp = getInterpretation(clamped);

  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    if (loading) return;
    const controls = animate(0, clamped, {
      duration: 0.9,
      ease: "easeOut",
      onUpdate: (v) => setDisplayed(Math.round(v)),
    });
    return () => controls.stop();
  }, [clamped, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="w-40 h-40 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-56" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="hsl(var(--muted))" strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color} strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-display text-foreground">
            {displayed}
            <span className="text-lg text-muted-foreground">%</span>
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Certitude
          </span>
        </div>
      </div>

      <div className="text-center max-w-xs">
        <p className="text-sm font-semibold text-foreground">{interp.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{interp.subtitle}</p>
      </div>
    </div>
  );
}
