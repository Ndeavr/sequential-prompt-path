/**
 * FloatingAlexRobot — The robot floats on the right side of the screen,
 * following scroll, until it reaches the Alex AI section where it docks.
 * Mobile only (hidden on md+). Stays solid — no blinking.
 */
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import UnproIcon from "@/components/brand/UnproIcon";

interface FloatingAlexRobotProps {
  alexSectionRef: React.RefObject<HTMLElement>;
}

export default function FloatingAlexRobot({ alexSectionRef }: FloatingAlexRobotProps) {
  const [docked, setDocked] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", () => {
    if (!alexSectionRef.current) return;
    const rect = alexSectionRef.current.getBoundingClientRect();
    setDocked(rect.top < window.innerHeight * 0.6);
  });

  if (docked) return null;

  return (
    <motion.div
      className="fixed z-40 w-[72px] right-4 md:hidden drop-shadow-[0_6px_20px_hsl(222_100%_61%_/_0.25)] pointer-events-none"
      style={{ top: "42vh" }}
      initial={{ opacity: 1 }}
      animate={{
        y: [0, -6, 0],
        rotate: [0, 1.5, -1.5, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      <UnproIcon size={72} variant="blue" />
    </motion.div>
  );
}
