/**
 * UNPRO — CTAGroup
 * Standardized CTA button row with consistent spacing and responsive layout.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CTAGroupProps {
  children: ReactNode;
  /** Center alignment */
  center?: boolean;
  className?: string;
}

export default function CTAGroup({ children, center = true, className }: CTAGroupProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-3",
        center && "items-center justify-center",
        className,
      )}
    >
      {children}
    </div>
  );
}
