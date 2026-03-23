/**
 * FloatingAlexRobot — The robot floats on the right side of the screen,
 * following scroll, until it reaches the Alex AI section where it docks.
 * Mobile only (hidden on md+).
 */
import { useState } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import unproRobot from "@/assets/unpro-robot.png";

interface FloatingAlexRobotProps {
  alexSectionRef: React.RefObject<HTMLElement>;
}

export default function FloatingAlexRobot({ alexSectionRef }: FloatingAlexRobotProps) {
  const [docked, setDocked] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", () => {
    if (!alexSectionRef.current) return;
    const rect = alexSectionRef.current.getBoundingClientRect();
    // Dock when the Alex section robot image is roughly in view
    setDocked(rect.top < window.innerHeight * 0.65);
  });

  return (
    <motion.img
      src={unproRobot}
      alt="Alex UNPRO"
      className="fixed z-40 w-[72px] right-4 md:hidden drop-shadow-[0_6px_20px_hsl(222_100%_61%_/_0.25)] pointer-events-none"
      style={{ top: "42vh" }}
      animate={
        docked
          ? { opacity: 0, scale: 0.5, y: 60 }
          : { opacity: 1, scale: 1, y: [0, -6, 0], rotate: [0, 2, -2, 0] }
      }
      transition={
        docked
          ? { duration: 0.4, ease: "easeInOut" }
          : { duration: 4, repeat: Infinity, ease: "easeInOut" }
      }
    />
  );
}
