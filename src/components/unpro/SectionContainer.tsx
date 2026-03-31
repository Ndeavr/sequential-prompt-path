/**
 * UNPRO — SectionContainer
 * Standardized section wrapper with consistent max-width, padding, and scroll animation.
 */

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp, viewportOnce } from "@/lib/motion";

interface SectionContainerProps {
  children: ReactNode;
  className?: string;
  /** Narrow (720px) | default (1280px) | wide (1440px) | full */
  width?: "narrow" | "default" | "wide" | "full";
  /** Add section-gradient background */
  gradient?: boolean;
  /** Disable scroll animation */
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
  const Comp = noAnimation ? as : motion[as];
  const animationProps = noAnimation
    ? {}
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
