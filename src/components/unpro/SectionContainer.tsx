/**
 * UNPRO — SectionContainer
 * Standardized section wrapper with consistent max-width, padding, and scroll animation.
 * Safety: never keeps content invisible — a 400ms fallback forces the visible state.
 */

import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp, viewportOnce, shouldSkipReveal } from "@/lib/motion";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  width?: "narrow" | "default" | "wide" | "full";
  gradient?: boolean;
  noAnimation?: boolean;
  id?: string;
  as?: "section" | "div";
}

const widthMap = {
  narrow: "max-w-3xl",
  default: "max-w-screen-xl",
  wide: "max-w-[1440px]",
  full: "w-full",
} as const;

export default function SectionContainer({
  children,
  className,
  width = "default",
  gradient = false,
  noAnimation = false,
  id,
  as = "section",
}: SectionContainerProps) {
  const skip = noAnimation || shouldSkipReveal();
  const [forceVisible, setForceVisible] = useState(skip);

  useEffect(() => {
    if (skip) return;
    // Safety net: if IntersectionObserver never fires (short viewport / mobile),
    // reveal after 400ms so the section never remains blank.
    const t = window.setTimeout(() => setForceVisible(true), 400);
    return () => window.clearTimeout(t);
  }, [skip]);

  const Comp = skip ? as : motion[as];
  const animationProps = skip
    ? {}
    : forceVisible
      ? { initial: "visible" as const, animate: "visible" as const, variants: fadeUp }
      : {
          initial: "hidden" as const,
          whileInView: "visible" as const,
          viewport: viewportOnce,
          variants: fadeUp,
        };

  return (
    <Comp
      id={id}
      className={cn(
        "px-5 py-12 md:py-16 mx-auto",
        widthMap[width],
        gradient && "section-gradient rounded-3xl",
        className,
      )}
      {...animationProps}
    >
      {children}
    </Comp>
  );
}
