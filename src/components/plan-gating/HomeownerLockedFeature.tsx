/**
 * UNPRO — Homeowner Locked Feature
 * Gates any homeowner feature behind the authoritative plan matrix and routes
 * to the real upgrade page with return context. Never renders a placeholder.
 */
import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHomeownerFeature, type HomeownerFeatureKey } from "@/features/planSystem/useHomeownerPlan";

const PLAN_LABEL: Record<string, string> = {
  home_decouverte: "Découverte",
  home_plus: "Plus",
  home_signature: "Signature",
};

interface Props {
  featureKey: HomeownerFeatureKey | string;
  children: ReactNode;
  mode?: "blur" | "replace" | "inline";
  className?: string;
  title?: string;
}

/** Build the canonical upgrade URL with feature + return context. */
export function useUpgradeHref(featureKey?: string, suggested?: string | null) {
  const { pathname, search } = useLocation();
  const q = new URLSearchParams();
  if (featureKey) q.set("feature", featureKey);
  if (suggested) q.set("suggested", suggested);
  q.set("return", `${pathname}${search}`);
  return `/upgrade?${q.toString()}`;
}

export default function HomeownerLockedFeature({
  featureKey,
  children,
  mode = "blur",
  className,
  title = "Fonctionnalité verrouillée",
}: Props) {
  const access = useHomeownerFeature(featureKey);
  const href = useUpgradeHref(featureKey, access.upgradeTarget);

  if (access.isLoading || access.allowed) return <>{children}</>;

  const targetLabel = PLAN_LABEL[access.upgradeTarget ?? "home_plus"] ?? "Plus";
  const teaser = access.teaser ?? "Débloquez cette fonctionnalité avec un plan supérieur.";

  const Card = (
    <div
      className={cn(
        "relative rounded-[28px] border border-border/40 bg-card/80 backdrop-blur-2xl",
        "p-6 sm:p-8 flex flex-col gap-4 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center">
          <Lock className="w-4 h-4 text-primary" />
        </div>
        <span className="text-xs uppercase tracking-widest text-primary font-semibold">
          Plan {targetLabel} requis
        </span>
      </div>
      <div>
        <h4 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">{title}</h4>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{teaser}</p>
      </div>
      <Link
        to={href}
        className="group inline-flex items-center justify-between gap-2 mt-2 px-5 py-3 rounded-[18px] bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all"
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
      <div className={cn("flex flex-wrap items-center gap-2 text-xs", className)}>
        <Lock className="w-3.5 h-3.5 text-primary" />
        <span className="text-muted-foreground">{teaser}</span>
        <Link
          to={href}
          className="text-primary font-semibold underline-offset-4 hover:underline"
        >
          {targetLabel}
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none select-none filter blur-md opacity-40">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center p-4">{Card}</div>
    </div>
  );
}
