/**
 * UNPRO — PageContractorFAQBuilder
 * AI FAQ generation, edit, sort, assign to services.
 */
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Sparkles, MessageSquare, ChevronDown, ChevronUp, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FunnelLayout from "@/components/contractor-funnel/FunnelLayout";
import CardGlass from "@/components/unpro/CardGlass";
import { useContractorFunnel } from "@/hooks/useContractorFunnel";
import { fadeUp, staggerContainer } from "@/lib/motion";
import type { ContractorFAQ } from "@/types/contractorFunnel";
import { buildTradeFaqs, resolveTradeDomain, type TradeFaqSeed } from "@/data/contractorFaqTemplates";
import { getKnownContractorContext } from "@/lib/contractorKnownContext";

let faqSeq = 0;
const toFaq = (seed: TradeFaqSeed, sortOrder: number): ContractorFAQ => ({
  id: `faq_${(faqSeq += 1)}`,
  category: seed.category,
  question: seed.question,
  answer: seed.draft,
  isPublished: false,
  sortOrder,
  sourceType: "ai_generated",
});

export default function PageContractorFAQBuilder() {
  const { state, goToStep } = useContractorFunnel();
  const known = useMemo(getKnownContractorContext, []);
  const trade = known.trade;
  const domain = useMemo(() => resolveTradeDomain(trade), [trade]);
  const domainLabel = domain?.label ?? trade;

  const [faqs, setFaqs] = useState<ContractorFAQ[]>(() =>
    buildTradeFaqs(trade, { limit: 5 }).map(toFaq),
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => {
      setFaqs((prev) => {
        const next = buildTradeFaqs(trade, {
          exclude: prev.map((f) => f.question),
          limit: 3,
        }).map((seed, i) => toFaq(seed, prev.length + i));
        setExhausted(next.length === 0);
        return [...prev, ...next];
      });
      setIsGenerating(false);
    }, 900);
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const togglePublish = (id: string) => {
    setFaqs((prev) =>
      prev.map((f) => (f.id === id ? { ...f, isPublished: !f.isPublished } : f))
    );
  };

  const removeFaq = (id: string) => {
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <>
      <Helmet>
        <title>FAQ Builder — {state.businessName || "AIPP"} | UNPRO</title>
      </Helmet>

      <FunnelLayout currentStep="faq_builder">
        <div className="max-w-2xl mx-auto">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 mb-4">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground mb-2">
              FAQ intelligente
            </h1>
            <p className="text-sm text-muted-foreground">
              Questions générées selon votre domaine — modifiez et publiez
            </p>
            {domainLabel && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3 w-3" />
                Domaine : {domainLabel}
              </p>
            )}
          </motion.div>

          {/* Generate button */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5 whitespace-normal leading-tight px-3"
              onClick={handleGenerate}
              disabled={isGenerating || exhausted || !trade}
            >
              <Sparkles className="mr-2 h-4 w-4 shrink-0" />
              {isGenerating
                ? "Génération en cours..."
                : exhausted
                  ? "Toutes les questions de votre domaine sont ajoutées"
                  : "Générer plus de FAQ reliées à mon domaine"}
            </Button>
            {!trade && (
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Indiquez votre métier principal pour générer des questions reliées à votre domaine.
              </p>
            )}
          </motion.div>

          {/* FAQ List */}
          <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="space-y-3">
            <AnimatePresence>
              {faqs.map((faq) => (
                <motion.div key={faq.id} variants={fadeUp} layout>
                  <CardGlass noAnimation className="!p-0">
                    {/* Header */}
                    <button
                      onClick={() => toggleExpand(faq.id)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <div className={`w-2 h-2 rounded-full ${faq.isPublished ? "bg-success" : "bg-muted-foreground"}`} />
                      <span className="flex-1 text-sm font-medium text-foreground">{faq.question}</span>
                      {expandedId === faq.id ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Expanded content */}
                    <AnimatePresence>
                      {expandedId === faq.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 space-y-3">
                            <p className="text-xs text-muted-foreground">{faq.answer}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {faq.category}
                              </span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {faq.sourceType === "ai_generated" ? "IA" : "Manuel"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => togglePublish(faq.id)}
                              >
                                {faq.isPublished ? "Masquer" : "Publier"}
                              </Button>
                              <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive" onClick={() => removeFaq(faq.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardGlass>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Navigation */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button variant="ghost" onClick={() => goToStep("assets_studio")} className="text-sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button
              className="flex-1 h-13 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-[var(--shadow-glow)]"
              onClick={() => goToStep("plan_recommendation")}
            >
              Choisir mon plan
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      </FunnelLayout>
    </>
  );
}
