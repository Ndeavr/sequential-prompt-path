/**
 * SectionBlock — enforces the "max 48px between sections" rule.
 *
 * The `gap` prop maps to a bounded margin-top; there is intentionally no
 * `xl` value. To exceed the cap you must supply `namedGap="reason"` — this
 * is grep-able so review can catch abuse.
 */

import type { ElementType, ReactNode, CSSProperties } from "react";

type Gap = "none" | "sm" | "md" | "lg";

interface SectionBlockProps {
  children: ReactNode;
  as?: ElementType;
  gap?: Gap;
  /** Escape hatch — must include a short human reason. */
  namedGap?: `${string}:${number}`;
  className?: string;
  style?: CSSProperties;
  id?: string;
}

const gapClass: Record<Gap, string> = {
  none: "mt-0",
  sm: "mt-4", // 16
  md: "mt-6", // 24
  lg: "mt-8", // 32 (hard ceiling)
};

export default function SectionBlock({
  children,
  as,
  gap = "md",
  namedGap,
  className = "",
  style,
  id,
}: SectionBlockProps) {
  const Tag = (as ?? "section") as ElementType;
  const gapStyle: CSSProperties | undefined = namedGap
    ? { marginTop: Number(namedGap.split(":")[1]) }
    : undefined;

  return (
    <Tag
      id={id}
      data-section-block
      className={[
        "relative isolate w-full max-w-full",
        namedGap ? "" : gapClass[gap],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={{ ...gapStyle, ...style }}
    >
      {children}
    </Tag>
  );
}
