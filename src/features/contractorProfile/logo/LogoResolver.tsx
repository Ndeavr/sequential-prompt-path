/**
 * UNPRO — LogoResolver
 * GLOBAL RULE: every contractor surface must render its logo through this component.
 * If a verified logo exists → SafeImage above the fold.
 * If not → branded MonogramBadge in premium glass card.
 * Never render an empty container, broken image, or "missing logo" text.
 */
import SafeImage from "@/components/media/SafeImage";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";
import MonogramBadge, { computeMonogramInitials } from "./MonogramBadge";
import type { ContractorLogo } from "../generator/pageTypes";

interface Props {
  logo?: Partial<ContractorLogo> | null;
  businessName: string;
  size?: number;
  className?: string;
  priority?: "eager" | "lazy";
}

export default function LogoResolver({ logo, businessName, size = 96, className, priority = "eager" }: Props) {
  const normalized = normalizeImageUrl(logo?.url ?? null);
  const usable = Boolean(normalized) && logo?.verified !== false;

  if (usable && normalized) {
    return (
      <SafeImage
        src={normalized}
        alt={`Logo ${businessName}`}
        width={size}
        height={size}
        priority={priority}
        source="LogoResolver"
        containerClassName={`rounded-2xl border border-white/10 ${className ?? ""}`}
      />
    );
  }

  const monogram = {
    initials: logo?.monogram?.initials || computeMonogramInitials(businessName),
    bg: logo?.monogram?.bg || "#0F1A2E",
    fg: logo?.monogram?.fg || "#F5C542",
  };
  return <MonogramBadge monogram={monogram} size={size} className={className} />;
}
