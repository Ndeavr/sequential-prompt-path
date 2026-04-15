/**
 * PanelDynamicContentSwitch — Renders dynamic content blocks based on selected pain.
 * Zero reload. Content swaps via AnimatePresence.
 */
import { motion, AnimatePresence } from "framer-motion";
import { type PainOption } from "@/hooks/useAdaptiveSession";
import { CheckCircle2, Zap, Shield } from "lucide-react";

interface ContentBlock {
  title: string;
  description: string;
  icon: "check" | "zap" | "shield";
}

const DEFAULT_BLOCKS: ContentBlock[] = [
  { title: "Instantané", description: "Résultat en moins de 5 secondes.", icon: "zap" },
  { title: "Sans friction", description: "Aucun formulaire. Juste une conversation.", icon: "check" },
  { title: "Garanti", description: "Professionnel vérifié. Rendez-vous confirmé.", icon: "shield" },
];

const ICON_MAP = { check: CheckCircle2, zap: Zap, shield: Shield };

interface Props {
  selectedPain: PainOption | null;
  blocks?: ContentBlock[];
}

export default function PanelDynamicContentSwitch({ selectedPain, blocks = DEFAULT_BLOCKS }: Props) {
  return (
    <section className="px-5 py-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedPain?.id ?? "default"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto"
        >
          {blocks.map((block, i) => {
            const Icon = ICON_MAP[block.icon];
            return (
              <motion.div
                key={block.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex flex-col items-center text-center p-4 rounded-2xl bg-card/40 border border-border/30 backdrop-blur-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground mb-1">{block.title}</h3>
                <p className="text-xs text-muted-foreground">{block.description}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
