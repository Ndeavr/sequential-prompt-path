/**
 * UNPRO — CardGlass
 * Premium glass-morphism card. Safety: never stays invisible — falls back
 * to visible state after 400ms if IntersectionObserver never fires.
 */

import { ReactNode, useEffect, useState } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { revealCard, viewportOnce, hoverLift, shouldSkipReveal } from "@/lib/motion";

interface CardGlassProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: ReactNode;
  hoverable?: boolean;
  elevated?: boolean;
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
  const skip = noAnimation || shouldSkipReveal();
  const [forceVisible, setForceVisible] = useState(skip);

  useEffect(() => {
    if (skip) return;
    const t = window.setTimeout(() => setForceVisible(true), 400);
    return () => window.clearTimeout(t);
  }, [skip]);

  const animationProps = skip
    ? {}
    : forceVisible
      ? { initial: "visible" as const, animate: "visible" as const, variants: revealCard }
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
