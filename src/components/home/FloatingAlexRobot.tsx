/**
 * FloatingAlexRobot — The robot floats on the right side of the screen,
 * following scroll, until it reaches the Alex AI section where it docks.
 * Mobile only (hidden on md+).
 */
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import unproRobot from "@/assets/unpro-robot.png";

interface FloatingAlexRobotProps {
  /** Ref to the Alex AI section where robot should dock */
  alexSectionRef: React.RefObject<HTMLElement>;
}

export default function FloatingAlexRobot({ alexSectionRef }: FloatingAlexRobotProps) {
  const [docked, setDocked] = useState(false);
  const [initialTop, setInitialTop] = useState(0);
  const robotSize = 72;

  const { scrollY } = useScroll();

  // Calculate when robot reaches the Alex section
  useMotionValueEvent(scrollY, "change", (latest) => {
    if (!alexSectionRef.current) return;
    const sectionRect = alexSectionRef.current.getBoundingClientRect();
    // Dock when the Alex section's top is within the viewport middle area
    const dockThreshold = sectionRect.top - window.innerHeight * 0.5;
    setDocked(dockThreshold <= 0);
  });

  // Robot vertical position: starts at hero area, follows scroll
  const robotY = useTransform(scrollY, (v) => {
    if (!alexSectionRef.current) return 0;
    const sectionTop = alexSectionRef.current.offsetTop;
    // Target: dock position relative to section
    const maxScroll = sectionTop - window.innerHeight * 0.5;
    // Smooth follow with slight lag
    return Math.min(v * 0.3, maxScroll * 0.3);
  });

  if (docked) return null; // Hidden when docked — the static robot in Alex section takes over

  return (
    <motion.img
      src={unproRobot}
      alt="Alex UNPRO"
      className="fixed z-40 w-[72px] right-4 md:hidden drop-shadow-[0_6px_20px_hsl(222_100%_61%_/_0.25)] pointer-events-none"
      style={{ top: "45vh" }}
      animate={{
        y: [0, -6, 0],
        rotate: [0, 2, -2, 0],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
