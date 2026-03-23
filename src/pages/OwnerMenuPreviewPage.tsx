/**
 * UNPRO — Owner Menu Preview Page
 * Shows the full homeowner universe after role selection:
 * Intent → Seasonal suggestions → Progressive service sections → Search
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAlexVoice } from "@/contexts/AlexVoiceContext";
import MainLayout from "@/layouts/MainLayout";
import OwnerIntentHero from "@/components/menu/OwnerIntentHero";
import SeasonalSuggestionsBar from "@/components/menu/SeasonalSuggestionsBar";
import ProgressiveRevealSections from "@/components/menu/ProgressiveRevealSections";
import SearchEverythingInput from "@/components/menu/SearchEverythingInput";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import type { MenuItemDef } from "@/data/menuTaxonomy";

export default function OwnerMenuPreviewPage() {
  const [intent, setIntent] = useState("");
  const [showUniverse, setShowUniverse] = useState(false);
  const navigate = useNavigate();

  const handleItemClick = (item: MenuItemDef) => {
    // Future: navigate to service page or open drawer
    console.log("Selected:", item.slug);
  };

  return (
    <MainLayout>
      <div className="min-h-[80vh] bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground font-display">
              L'univers de votre propriété
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Rénovation, entretien, experts, assurance, permis, télécoms — tout au même endroit.
            </p>
          </motion.div>

          {/* Search */}
          <SearchEverythingInput onSelect={handleItemClick} />

          {/* Intent Selection */}
          <AnimatePresence mode="wait">
            {!showUniverse ? (
              <motion.div key="intent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="space-y-5">
                <OwnerIntentHero selected={intent} onSelect={setIntent} />
                {intent && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Button className="w-full h-11 gap-2 text-sm font-semibold rounded-xl" onClick={() => setShowUniverse(true)}>
                      Explorer les services <ArrowRight className="h-4 w-4" />
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div key="universe" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                {/* Seasonal chips */}
                <SeasonalSuggestionsBar onItemClick={handleItemClick} />

                {/* Progressive sections */}
                <ProgressiveRevealSections onItemClick={handleItemClick} />

                {/* Alex CTA */}
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">Pas certain ?</div>
                    <p className="text-xs text-muted-foreground">Alex peut vous guider vers le bon service.</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg text-xs shrink-0" onClick={() => { const { openAlex } = useAlexVoice(); openAlex("general"); }}>
                    Parler à Alex
                  </Button>
                </motion.div>

                {/* Back */}
                <button type="button" onClick={() => setShowUniverse(false)} className="text-sm text-muted-foreground hover:text-foreground mx-auto block">
                  ← Changer mon intention
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}
