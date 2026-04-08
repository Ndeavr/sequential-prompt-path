/**
 * PageHomeIntentUNPRO — Intent-based homepage with Alex Concierge V2.
 * State machine-driven: NOT_LOGGED → LOGGED_NO_PROPERTY → CONTEXT_UNKNOWN → MATCH → BOOK
 * 
 * RULES:
 * - Alex never asks useless questions
 * - No "3 soumissions", no "on vous rappelle"
 * - Every interaction leads to an action
 */
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import MainLayout from "@/layouts/MainLayout";
import AlexConciergeShell from "@/components/alex-concierge/AlexConciergeShell";
import { useAuth } from "@/hooks/useAuth";

export default function PageHomeIntentUNPRO() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.first_name || null;

  const greeting = userName ? `Bonjour ${userName}.` : "Décrivez votre besoin.";
  const sub = "On s'occupe du reste.";

  return (
    <MainLayout>
      <Helmet>
        <title>UNPRO — Votre projet, notre match | IA 24/7</title>
        <meta name="description" content="Décrivez votre besoin en 5 secondes. UNPRO trouve le bon professionnel et vous donne un rendez-vous garanti." />
        <link rel="canonical" href="https://unpro.ca" />
      </Helmet>

      <div className="relative flex flex-col min-h-screen">
        {/* Aura background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/6 blur-[100px]" />
        </div>

        {/* Hero */}
        <section className="flex flex-col items-center justify-center px-5 pt-20 pb-6 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-foreground mb-2"
          >
            {greeting}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="text-base text-muted-foreground mb-8"
          >
            {sub}
          </motion.p>
        </section>

        {/* Alex Concierge V2 — State Machine UI */}
        <section className="flex-1 px-5 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <AlexConciergeShell />
          </motion.div>
        </section>
      </div>
    </MainLayout>
  );
}
