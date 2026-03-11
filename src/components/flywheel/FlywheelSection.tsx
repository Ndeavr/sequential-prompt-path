import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { flywheelNodes } from "./flywheelData";
import { FlywheelCenterCore } from "./FlywheelCenterCore";
import { FlywheelNode } from "./FlywheelNode";
import { FlywheelConnectionPaths } from "./FlywheelConnectionPaths";
import { FlywheelDetailCard } from "./FlywheelDetailCard";
import { FlywheelSummaryCards } from "./FlywheelSummaryCards";
import { FlywheelCTA } from "./FlywheelCTA";
import { useIsMobile } from "@/hooks/use-mobile";

export const FlywheelSection = () => {
  const [activeId, setActiveId] = useState<number | null>(1);
  const isMobile = useIsMobile();

  const radius = isMobile ? 120 : 190;
  const containerSize = isMobile ? 300 : 460;
  const center = containerSize / 2;

  const activeNode = useMemo(
    () => flywheelNodes.find((n) => n.id === activeId) ?? null,
    [activeId]
  );

  return (
    <section className="relative py-16 md:py-28 overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 30%, hsl(222 100% 65% / 0.04) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 70% 70%, hsl(252 100% 72% / 0.03) 0%, transparent 70%)",
        }}
      />

      <div className="container relative z-10 max-w-6xl mx-auto px-4 md:px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-12 md:mb-16"
        >
          <p className="text-caption uppercase tracking-[0.2em] text-primary font-semibold mb-3">
            Effet réseau
          </p>
          <h2 className="font-display text-hero-sm md:text-hero lg:text-display text-foreground mb-4">
            The UNPRO Growth Flywheel
          </h2>
          <p className="text-body-lg text-muted-foreground max-w-2xl mx-auto mb-4">
            Chaque nouveau propriétaire, projet et entrepreneur rend le réseau plus intelligent, plus fort et plus précieux.
          </p>
          <p className="text-body text-muted-foreground/70 max-w-xl mx-auto">
            UNPRO n'est pas un répertoire ou une plateforme de leads. C'est un système auto-renforçant où chaque interaction améliore les recommandations, la qualité des données et l'intelligence de quartier.
          </p>
        </motion.div>

        {/* Flywheel + Detail layout */}
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 mb-16 md:mb-24">
          {/* Flywheel diagram */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative flex-shrink-0"
            style={{ width: containerSize, height: containerSize }}
          >
            <FlywheelConnectionPaths
              nodes={flywheelNodes}
              activeId={activeId}
              radius={radius}
              center={center}
            />
            <FlywheelCenterCore />
            {flywheelNodes.map((node, i) => (
              <FlywheelNode
                key={node.id}
                node={node}
                index={i}
                total={flywheelNodes.length}
                isActive={activeId === node.id}
                onSelect={setActiveId}
                radius={radius}
              />
            ))}
          </motion.div>

          {/* Detail panel */}
          <div className="flex-1 min-w-0 w-full lg:max-w-md">
            <FlywheelDetailCard node={activeNode} />

            {/* Mini node selector for mobile */}
            <div className="flex flex-wrap gap-1.5 mt-4 lg:hidden justify-center">
              {flywheelNodes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setActiveId(n.id)}
                  className={`text-[0.6rem] px-2.5 py-1 rounded-full border transition-all ${
                    activeId === n.id
                      ? "border-primary/50 bg-primary/10 text-foreground"
                      : "border-border/30 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loop-back message */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 md:mb-24"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-border/30 bg-card/50 backdrop-blur-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
            <span className="text-meta text-muted-foreground">
              Plus de confiance → plus de curiosité → <span className="text-foreground font-semibold">plus de propriétaires</span>
            </span>
          </div>
        </motion.div>

        {/* Summary cards */}
        <div className="mb-16 md:mb-24">
          <FlywheelSummaryCards />
        </div>

        {/* CTA */}
        <FlywheelCTA />
      </div>
    </section>
  );
};
