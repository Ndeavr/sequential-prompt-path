/**
 * UNPRO — PageContractorFAQBuilder
 * AI FAQ generation, edit, sort, assign to services.
 */
import { useState } from "react";
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

const MOCK_FAQS: ContractorFAQ[] = [
  { id: "1", category: "services", question: "Quels types de toitures installez-vous?", answer: "Nous installons tous les types de toitures résidentielles : bardeaux d'asphalte, toiture métallique, membrane TPO et toiture verte.", isPublished: true, sortOrder: 0, sourceType: "ai_generated" },
  { id: "2", category: "prix", question: "Comment sont calculés vos prix?", answer: "Nos prix sont basés sur la superficie, le type de matériaux choisis et la complexité du projet. Nous offrons des estimations gratuites.", isPublished: true, sortOrder: 1, sourceType: "ai_generated" },
  { id: "3", category: "garanties", question: "Offrez-vous une garantie sur vos travaux?", answer: "Oui, nous offrons une garantie de 10 ans sur la main-d'œuvre et les matériaux sont couverts par la garantie du fabricant.", isPublished: true, sortOrder: 2, sourceType: "ai_generated" },
  { id: "4", category: "délais", question: "Quel est le délai moyen pour une réfection de toiture?", answer: "La plupart des projets résidentiels sont complétés en 1 à 3 jours, selon la taille et la complexité.", isPublished: true, sortOrder: 3, sourceType: "ai_generated" },
  { id: "5", category: "urgences", question: "Offrez-vous un service d'urgence?", answer: "Oui, nous offrons un service d'urgence 24/7 pour les fuites et les dommages causés par les intempéries.", isPublished: true, sortOrder: 4, sourceType: "ai_generated" },
];

export default function PageContractorFAQBuilder() {
  const { state, goToStep } = useContractorFunnel();
  const [faqs, setFaqs] = useState<ContractorFAQ[]>(MOCK_FAQS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => setIsGenerating(false), 2000);
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
              Questions générées par IA — éditez et publiez
            </p>
          </motion.div>

          {/* Generate button */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="mb-6">
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl border-dashed border-primary/30 text-primary hover:bg-primary/5"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {isGenerating ? "Génération en cours..." : "Générer plus de FAQ avec l'IA"}
            </Button>
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
