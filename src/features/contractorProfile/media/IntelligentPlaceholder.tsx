/**
 * UNPRO — Intelligent branded placeholder per media category.
 * Never renders an empty container.
 */
import { cn } from "@/lib/utils";
import { Users, Truck, Hammer, Camera, Home, Sparkles } from "lucide-react";
import type { MediaCategory } from "../generator/pageTypes";

const CATEGORY_META: Record<MediaCategory, { label: string; Icon: typeof Users; hint: string }> = {
  logo: { label: "Logo", Icon: Sparkles, hint: "Identité visuelle" },
  team: { label: "Équipe", Icon: Users, hint: "Portrait de l'équipe" },
  vehicle: { label: "Véhicule", Icon: Truck, hint: "Flotte identifiée" },
  completed_project: { label: "Projet complété", Icon: Home, hint: "Réalisation récente" },
  before_after: { label: "Avant / après", Icon: Camera, hint: "Transformation" },
  service: { label: "Service", Icon: Hammer, hint: "Intervention en cours" },
};

interface Props {
  category: MediaCategory;
  businessName?: string;
  aspectRatio?: string;
  className?: string;
}

export default function IntelligentPlaceholder({ category, businessName, aspectRatio = "4/3", className }: Props) {
  const meta = CATEGORY_META[category];
  const Icon = meta.Icon;
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-white/10 overflow-hidden",
        "bg-gradient-to-br from-[#0B1626] via-[#0F1A2E] to-[#050816]",
        className,
      )}
      style={{ aspectRatio }}
      aria-label={`Illustration ${meta.label}${businessName ? ` — ${businessName}` : ""}`}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background: "radial-gradient(circle at 30% 20%, rgba(245,197,66,0.18), transparent 55%), radial-gradient(circle at 70% 80%, rgba(0,180,220,0.15), transparent 55%)",
        }}
      />
      <div className="relative h-full w-full flex flex-col items-center justify-center gap-2 p-4 text-center">
        <div className="rounded-full bg-white/5 border border-white/10 p-3">
          <Icon className="h-6 w-6 text-amber-300/90" />
        </div>
        <div className="text-[11px] uppercase tracking-[0.2em] text-white/60">{meta.label}</div>
        <div className="text-[10px] text-white/40">{meta.hint}</div>
      </div>
    </div>
  );
}
