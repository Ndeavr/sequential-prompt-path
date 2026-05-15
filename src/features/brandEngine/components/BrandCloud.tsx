/**
 * UNPRO — BrandCloud
 * Animated marquee of monochrome brand logos. Premium, dark-mode first.
 */
import { cn } from "@/lib/utils";
import LogoMonochromeRenderer from "./LogoMonochromeRenderer";
import type { Brand } from "../types";

interface Props {
  brands: Brand[];
  className?: string;
  speedSec?: number;
}

export default function BrandCloud({ brands, className, speedSec = 40 }: Props) {
  if (!brands.length) return null;
  const loop = [...brands, ...brands]; // double for seamless marquee

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div
        className="absolute inset-y-0 left-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to right, hsl(var(--background)), transparent)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-16 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, hsl(var(--background)), transparent)" }}
      />
      <div
        className="flex gap-10 items-center brand-cloud-track"
        style={{ animationDuration: `${speedSec}s` }}
      >
        {loop.map((b, i) => (
          <div key={`${b.id}-${i}`} className="shrink-0">
            <LogoMonochromeRenderer brand={b} height={32} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes brandCloudScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .brand-cloud-track {
          width: max-content;
          animation-name: brandCloudScroll;
          animation-iteration-count: infinite;
          animation-timing-function: linear;
        }
        .brand-cloud-track:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
