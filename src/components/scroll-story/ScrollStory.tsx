import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { fadeUp, transitions, viewportOnce } from "@/lib/motion";

const ScrollProgressContext = createContext<MotionValue<number> | null>(null);

export function useStoryProgress() {
  return useContext(ScrollProgressContext);
}

interface BaseProps {
  children: ReactNode;
  className?: string;
  id?: string;
}

export function ScrollStory({ children, className, id }: BaseProps) {
  return (
    <div
      id={id}
      data-scroll-story
      className={cn(
        "alex-immersive relative isolate overflow-x-clip bg-background text-foreground",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function EditorialScene({ children, className, id }: BaseProps) {
  return (
    <section
      id={id}
      data-scroll-scene
      className={cn(
        "relative isolate flex min-h-[82svh] w-full items-center overflow-hidden px-5 py-16 md:min-h-[92dvh] md:px-8 md:py-24",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_28%,hsl(var(--primary)/0.14),transparent_38%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--card)))]" />
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </section>
  );
}

export function RevealSection({ children, className, id }: BaseProps) {
  const reduced = useReducedMotion();
  return (
    <motion.section
      id={id}
      data-section-block
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={viewportOnce}
      variants={fadeUp}
      className={cn("relative isolate w-full px-5 py-14 md:px-8 md:py-20", className)}
    >
      <div className="mx-auto w-full max-w-7xl">{children}</div>
    </motion.section>
  );
}

interface StickySceneProps extends BaseProps {
  heightClassName?: string;
}

export function StickyScene({ children, className, heightClassName, id }: StickySceneProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  if (reduced) {
    return (
      <section id={id} className={cn("relative px-5 py-16 md:px-8 md:py-24", className)}>
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      id={id}
      data-sticky-scene
      className={cn("relative", heightClassName ?? "min-h-[180svh] md:min-h-[240dvh]", className)}
    >
      <div className="sticky top-0 flex min-h-[100svh] items-center overflow-hidden px-5 py-16 md:px-8 md:py-20">
        <ScrollProgressContext.Provider value={scrollYProgress}>
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </ScrollProgressContext.Provider>
      </div>
    </section>
  );
}

interface ParallaxMediaProps extends BaseProps {
  distance?: number;
}

export function ParallaxMedia({ children, className, distance = 32 }: ParallaxMediaProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], reduced ? [0, 0] : [distance, -distance]);

  return (
    <motion.div ref={ref} style={{ y }} className={cn("will-change-transform", className)}>
      {children}
    </motion.div>
  );
}

interface ScrollTextRevealProps extends BaseProps {
  eyebrow?: string;
  title: string;
  body?: string;
  align?: "left" | "center";
}

export function ScrollTextReveal({ eyebrow, title, body, children, className, align = "left" }: ScrollTextRevealProps) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? "visible" : "hidden"}
      whileInView="visible"
      viewport={viewportOnce}
      variants={{
        hidden: { opacity: 0, y: 30, scale: 0.985 },
        visible: { opacity: 1, y: 0, scale: 1, transition: transitions.slow },
      }}
      className={cn("max-w-4xl", align === "center" && "mx-auto text-center", className)}
    >
      {eyebrow && <p className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-tint">{eyebrow}</p>}
      <h2 className="text-balance font-display text-[clamp(2.6rem,7vw,6.8rem)] font-semibold leading-[0.94] text-foreground">
        {title}
      </h2>
      {body && <p className="mt-6 max-w-2xl text-base leading-relaxed text-readable-secondary md:text-xl">{body}</p>}
      {children}
    </motion.div>
  );
}

interface ViewportPanelProps extends BaseProps {
  tone?: "default" | "accent" | "quiet";
}

export function ViewportPanel({ children, className, tone = "default", id }: ViewportPanelProps) {
  return (
    <div
      id={id}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] border p-5 shadow-2xl backdrop-blur-2xl md:p-8",
        tone === "accent" && "border-primary/35 bg-primary/10",
        tone === "quiet" && "border-border/70 bg-muted/40",
        tone === "default" && "border-border/80 bg-card/85",
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foreground/35 to-transparent" />
      {children}
    </div>
  );
}

interface StackedCardItem {
  kicker: string;
  title: string;
  body: string;
  content?: ReactNode;
}

export function StackedCards({ items, className }: { items: StackedCardItem[]; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={cn("relative space-y-5", className)}>
      {items.map((item, index) => (
        <motion.article
          key={`${item.kicker}-${item.title}`}
          initial={reduced ? false : { opacity: 0, y: 30, scale: 0.985 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-12% 0px -12% 0px" }}
          transition={{ ...transitions.slow, delay: reduced ? 0 : index * 0.04 }}
          className={cn(
            "border border-border/80 bg-card/90 p-6 shadow-2xl backdrop-blur-2xl md:p-9",
            "rounded-[var(--radius-card)] md:sticky",
          )}
          style={{ top: reduced ? undefined : `${76 + index * 16}px`, zIndex: index + 1 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-tint">{item.kicker}</p>
          <h3 className="mt-3 text-2xl font-semibold text-foreground md:text-4xl">{item.title}</h3>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-readable-secondary md:text-base">{item.body}</p>
          {item.content && <div className="mt-6">{item.content}</div>}
        </motion.article>
      ))}
    </div>
  );
}

export function SectionTransition({ children, className }: BaseProps) {
  return (
    <div className={cn("relative overflow-hidden border-y border-border/50 bg-muted/25", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent,hsl(var(--primary)/0.08),transparent)]" />
      {children}
    </div>
  );
}

export function StickyMediaText({ media, children, className }: BaseProps & { media: ReactNode }) {
  return (
    <div className={cn("grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14", className)}>
      <div className="self-start lg:sticky lg:top-24">{media}</div>
      <div className="space-y-8">{children}</div>
    </div>
  );
}