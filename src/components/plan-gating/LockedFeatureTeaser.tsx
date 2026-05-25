import { ReactNode } from "react";
import { Lock, Sparkles, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useFeatureAccess } from "@/features/planSystem";
import type { FeatureKey } from "@/features/planSystem/types";

interface Props {
  featureKey: FeatureKey | string;
  children: ReactNode;
  mode?: "blur" | "replace" | "inline";
  className?: string;
  fallbackTitle?: string;
}

const PLAN_LABEL: Record<string, string> = {
  recrue: "Recrue",
  pro: "Pro",
  premium: "Premium",
  elite: "Élite",
  signature: "Signature",
};

export default function LockedFeatureTeaser({
  featureKey,
  children,
  mode = "blur",
  className,
  fallbackTitle = "Fonctionnalité verrouillée",
}: Props) {
  const access = useFeatureAccess(featureKey);

  if (access.allowed) return <>{children}</>;

  const target = access.upgradeTarget ?? "premium";
  const targetLabel = PLAN_LABEL[target] ?? "Premium";
  const teaser = access.teaser ?? "Débloquez cette fonctionnalité avec un plan supérieur.";

  const Card = (
    <div
      className={cn(
        "relative rounded-[28px] border border-white/10 bg-white/[0.04] backdrop-blur-2xl",
        "p-6 sm:p-8 flex flex-col gap-4 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center">
          <Lock className="w-4 h-4 text-amber-300" />
        </div>
        <span className="text-xs uppercase tracking-widest text-amber-300/80 font-semibold">
          Plan {targetLabel} requis
        </span>
      </div>
      <div>
        <h4 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
          {fallbackTitle}
        </h4>
        <p className="mt-2 text-sm text-white/70 leading-relaxed">{teaser}</p>
      </div>
      <Link
        to={`/entrepreneurs/plans?suggested=${target}`}
        className="group inline-flex items-center justify-between gap-2 mt-2 px-5 py-3 rounded-[18px] bg-white text-black font-semibold text-sm hover:bg-white/90 transition-all"
      >
        <span className="inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Passer à {targetLabel}
        </span>
        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </Link>
    </div>
  );

  if (mode === "replace") return Card;

  if (mode === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-xs", className)}>
        <Lock className="w-3.5 h-3.5 text-amber-300" />
        <span className="text-white/70">{teaser}</span>
        <Link
          to={`/entrepreneurs/plans?suggested=${target}`}
          className="text-amber-300 hover:text-amber-200 font-semibold underline-offset-4 hover:underline"
        >
          {targetLabel}
        </Link>
      </div>
    );
  }

  // blur mode: render children blurred behind the teaser overlay
  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none select-none filter blur-md opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-4">{Card}</div>
    </div>
  );
}
