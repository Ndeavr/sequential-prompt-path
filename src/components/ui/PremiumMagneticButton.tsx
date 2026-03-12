/**
 * PremiumMagneticButton — Tactile 3D press button with magnetic hover,
 * ripple effect, sweep on release, and premium glassmorphism shell.
 * Action triggers on pointer release, not press.
 */
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type PremiumMagneticButtonProps = {
  children: React.ReactNode;
  href?: string;
  onReleaseAction?: () => void | Promise<void>;
  disabled?: boolean;
  className?: string;
  delayMs?: number;
  variant?: "dark" | "light" | "indigo";
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
};

export function PremiumMagneticButton({
  children,
  href,
  onReleaseAction,
  disabled = false,
  className,
  delayMs = 150,
  variant = "indigo",
  iconRight,
  fullWidth = false,
}: PremiumMagneticButtonProps) {
  const navigate = useNavigate();

  const [pressed, setPressed] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const [sweeping, setSweeping] = React.useState(false);
  const [ripples, setRipples] = React.useState<
    { id: number; x: number; y: number }[]
  >([]);
  const [magnet, setMagnet] = React.useState({ x: 0, y: 0 });

  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const lockedRef = React.useRef(false);
  const rippleId = React.useRef(0);

  const styles = {
    dark: {
      shell:
        "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06))] text-white",
      glow: "bg-white/20",
      textSubtle: "text-white/70",
    },
    light: {
      shell:
        "border-black/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,245,245,0.92))] text-black",
      glow: "bg-black/10",
      textSubtle: "text-black/70",
    },
    indigo: {
      shell:
        "border-primary/20 bg-[linear-gradient(180deg,hsl(var(--primary)/0.42),hsl(var(--primary)/0.22))] text-primary-foreground",
      glow: "bg-primary/30",
      textSubtle: "text-primary-foreground/80",
    },
  }[variant];

  const addRipple = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++rippleId.current;
    setRipples((prev) => [...prev, { id, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 700);
  };

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || pressed) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setMagnet({ x: (px - 0.5) * 10, y: (py - 0.5) * 8 });
  };

  const resetMagnet = () => setMagnet({ x: 0, y: 0 });

  const runAction = async () => {
    if (disabled || lockedRef.current) return;
    lockedRef.current = true;
    setSweeping(true);

    await new Promise((r) => setTimeout(r, delayMs));

    try {
      if (onReleaseAction) {
        await onReleaseAction();
      } else if (href) {
        navigate(href);
      }
    } finally {
      setTimeout(() => {
        setSweeping(false);
        lockedRef.current = false;
      }, 240);
    }
  };

  return (
    <motion.button
      ref={buttonRef}
      type="button"
      disabled={disabled}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => {
        setHovered(false);
        setPressed(false);
        resetMagnet();
      }}
      onPointerMove={handleMove}
      onPointerDown={(e) => {
        if (disabled) return;
        setPressed(true);
        addRipple(e);
      }}
      onPointerUp={() => {
        setPressed(false);
        resetMagnet();
        void runAction();
      }}
      onPointerCancel={() => {
        setPressed(false);
        resetMagnet();
      }}
      animate={{
        x: hovered && !pressed ? magnet.x : 0,
        y: pressed ? 2 : hovered ? magnet.y * 0.7 : 0,
        scale: pressed ? 0.982 : hovered ? 1.01 : 1,
        rotateX: hovered && !pressed ? -magnet.y * 0.35 : 0,
        rotateY: hovered && !pressed ? magnet.x * 0.45 : 0,
        boxShadow: disabled
          ? "0 8px 18px rgba(0,0,0,0.10)"
          : pressed
          ? "0 8px 20px rgba(0,0,0,0.20), inset 0 1px 1px rgba(255,255,255,0.08)"
          : hovered
          ? "0 22px 50px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.18)"
          : "0 16px 36px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.16)",
      }}
      transition={{
        type: "spring",
        stiffness: 320,
        damping: 24,
        mass: 0.8,
      }}
      className={cn(
        "group relative isolate overflow-hidden rounded-2xl border px-6 py-4",
        "backdrop-blur-xl select-none will-change-transform [transform-style:preserve-3d]",
        "disabled:cursor-not-allowed disabled:opacity-60",
        fullWidth && "w-full",
        styles.shell,
        className
      )}
      style={{ transformPerspective: 1200 }}
    >
      {/* Top highlight gradient */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80"
        animate={{
          background:
            variant === "light"
              ? "linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0))"
              : "linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0))",
          y: pressed ? 10 : 0,
          opacity: pressed ? 0.45 : hovered ? 0.8 : 0.65,
        }}
        transition={{ duration: 0.16 }}
      />

      {/* Hover glow */}
      <motion.span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -inset-x-10 -top-10 h-20 blur-2xl",
          styles.glow
        )}
        animate={{
          opacity: hovered ? 0.8 : 0.35,
          y: hovered ? 8 : 0,
        }}
        transition={{ duration: 0.25 }}
      />

      {/* Sweep on release */}
      <AnimatePresence>
        {sweeping && !disabled && (
          <motion.span
            aria-hidden
            initial={{ x: "-140%", opacity: 0 }}
            animate={{ x: "180%", opacity: 0.24 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.52, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -skew-x-12 bg-white/35 blur-xl"
          />
        )}
      </AnimatePresence>

      {/* Ripples */}
      <AnimatePresence>
        {ripples.map((ripple) => (
          <motion.span
            key={ripple.id}
            aria-hidden
            initial={{ scale: 0, opacity: 0.28 }}
            animate={{ scale: 7, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute h-10 w-10 rounded-full bg-white/30 blur-md"
            style={{
              left: ripple.x - 20,
              top: ripple.y - 20,
            }}
          />
        ))}
      </AnimatePresence>

      {/* Specular highlight */}
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-2xl"
        animate={{ opacity: hovered ? 1 : 0.5 }}
        transition={{ duration: 0.2 }}
        style={{
          background:
            "radial-gradient(120px 60px at 50% 0%, rgba(255,255,255,0.20), transparent 70%)",
        }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center justify-center gap-3 font-medium tracking-tight">
        <motion.span
          animate={{ y: pressed ? 0.6 : 0 }}
          transition={{ duration: 0.12 }}
        >
          {children}
        </motion.span>

        {iconRight && (
          <motion.span
            animate={{ x: hovered && !pressed ? 2 : 0, y: pressed ? 0.6 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={cn("inline-flex", styles.textSubtle)}
          >
            {iconRight}
          </motion.span>
        )}
      </span>
    </motion.button>
  );
}
