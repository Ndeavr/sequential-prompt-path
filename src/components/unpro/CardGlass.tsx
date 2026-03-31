/**
 * UNPRO — CardGlass
 * Premium glass-morphism card using design tokens.
 */

import { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { revealCard, viewportOnce, hoverLift } from "@/lib/motion";

interface CardGlassProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  /** Elevate with hover lift effect */
  hoverable?: boolean;
  /** Use glass-card vs glass-card-elevated */
  elevated?: boolean;
  /** Disable scroll reveal */
  noAnimation?: boolean;
  className?: string;
}

export default function CardGlass({
  children,
  hoverable = false,
  elevated = false,
  noAnimation = false,
  className,
  ...rest
}: CardGlassProps) {
  const animationProps = noAnimation
    ? {}
    : {
        initial: "hidden" as const,
        whileInView: "visible" as const,
        viewport: viewportOnce,
        variants: revealCard,
      };

  return (
    <motion.div
      className={cn(
        elevated ? "glass-card-elevated" : "glass-card",
        "p-5 sm:p-6",
        className,
      )}
      {...(hoverable ? hoverLift : {})}
      {...animationProps}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
