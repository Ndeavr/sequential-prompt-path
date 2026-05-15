/** UNPRO — BrandPill */
import { cn } from "@/lib/utils";
import { ShieldCheck } from "lucide-react";
import LogoMonochromeRenderer from "./LogoMonochromeRenderer";
import type { Brand, ContractorBrandProfile } from "../types";

interface Props {
  brand: Brand;
  certified?: boolean;
  primary?: boolean;
  className?: string;
}

export default function BrandPill({ brand, certified, primary, className }: Props) {
  return (
    <div
      className={cn(
        "group flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-300",
        "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12]",
        primary && "ring-1 ring-primary/40 bg-primary/[0.06]",
        className,
      )}
    >
      <LogoMonochromeRenderer brand={brand} height={20} />
      <span className="text-xs font-medium text-foreground/80 group-hover:text-foreground">
        {brand.name}
      </span>
      {certified && (
        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary">
          <ShieldCheck className="w-3 h-3" />
          Certifié
        </span>
      )}
    </div>
  );
}

export function BrandPillFromProfile({
  profile,
}: {
  profile: ContractorBrandProfile & { brand: Brand };
}) {
  return (
    <BrandPill
      brand={profile.brand}
      certified={profile.is_certified}
      primary={profile.is_primary_ecosystem}
    />
  );
}
