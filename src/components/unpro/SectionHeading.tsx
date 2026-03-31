/**
 * UNPRO — SectionHeading
 * Standardized section header with label / title / description using CSS utility classes.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  /** Small uppercase label above title */
  label?: string;
  title: string;
  description?: string;
  /** Center alignment (default true) */
  center?: boolean;
  children?: ReactNode;
  className?: string;
}

export default function SectionHeading({
  label,
  title,
  description,
  center = true,
  children,
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn("space-y-3 mb-10", center && "text-center", className)}>
      {label && <p className="section-label">{label}</p>}
      <h2 className="section-title">{title}</h2>
      {description && <p className="section-desc">{description}</p>}
      {children}
    </div>
  );
}
