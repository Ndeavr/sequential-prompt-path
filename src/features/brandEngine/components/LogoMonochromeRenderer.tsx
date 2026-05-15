/**
 * UNPRO — LogoMonochromeRenderer
 * Renders a brand logo in monochrome by default, color on hover.
 * - Prefers SVG (CSS filter), falls back to PNG with grayscale.
 * - Uses currentColor when possible.
 */
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Brand } from "../types";

interface Props {
  brand: Pick<Brand, "name" | "logo_svg_url" | "logo_png_url" | "logo_grey_svg_url" | "logo_grey_png_url" | "website">;
  className?: string;
  /** Show color on hover instead of staying monochrome */
  colorOnHover?: boolean;
  /** Render fixed height */
  height?: number;
}

export default function LogoMonochromeRenderer({
  brand,
  className,
  colorOnHover = true,
  height = 28,
}: Props) {
  const [errored, setErrored] = useState(false);

  const monoSrc = brand.logo_grey_svg_url || brand.logo_grey_png_url;
  const colorSrc = brand.logo_svg_url || brand.logo_png_url;
  const hasMono = !!monoSrc;
  const hasAny = !!(monoSrc || colorSrc);

  if (!hasAny || errored) {
    // Fallback: render brand initial in a dim chip
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center px-2 rounded-md bg-white/[0.04] border border-white/[0.06] text-foreground/70 text-xs font-medium tracking-wide uppercase",
          className,
        )}
        style={{ height }}
        aria-label={brand.name}
      >
        {brand.name}
      </span>
    );
  }

  // Two stacked images: mono shown by default, color revealed on hover.
  return (
    <span
      className={cn("relative inline-block group align-middle", className)}
      style={{ height }}
      title={brand.name}
    >
      <img
        src={(hasMono ? monoSrc : colorSrc)!}
        alt={brand.name}
        loading="lazy"
        decoding="async"
        onError={() => setErrored(true)}
        className={cn(
          "h-full w-auto select-none transition-all duration-300",
          // If we don't have a true mono asset, fake it via grayscale
          !hasMono && "opacity-60 grayscale brightness-150 contrast-75",
          colorOnHover && "group-hover:opacity-100 group-hover:grayscale-0 group-hover:brightness-100 group-hover:contrast-100",
        )}
        style={{ height }}
      />
      {colorOnHover && hasMono && colorSrc && (
        <img
          src={colorSrc}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-auto opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ height }}
        />
      )}
    </span>
  );
}
