/** Homeowner-first concierge hero. */
import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";

import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";
import BlueprintOverlay from "@/components/home-unicorn/BlueprintOverlay";
import sceneImage from "@/assets/scenes/scene-1-exterior.jpg";
import { useLanguage } from "@/components/ui/LanguageToggle";

export default function HeroHomeownerLight() {
  const { lang } = useLanguage();
  const copy = lang === "fr"
    ? {
        lineOne: "Trouvez le bon entrepreneur.",
        lineTwo: "Pas trois soumissions.",
        subtitle: "Clara analyse votre projet et vous recommande le meilleur match.",
        trust: "Rendez-vous exclusifs",
      }
    : {
        lineOne: "Find the right contractor.",
        lineTwo: "Not three quotes.",
        subtitle: "Clara analyzes your project and recommends the best match.",
        trust: "Exclusive appointments",
      };

  return (
    <section className="home-glossy-hero relative isolate overflow-hidden">
      <img
        aria-hidden="true"
        src={sceneImage}
        alt=""
        width={1600}
        height={900}
        fetchPriority="high"
        className="home-architecture pointer-events-none absolute inset-y-0 right-0 z-0 h-full w-full object-cover"
      />
      <div aria-hidden="true" className="home-architecture-veil pointer-events-none absolute inset-0 z-[1]" />
      <div aria-hidden="true" className="home-blueprint pointer-events-none absolute inset-y-0 left-0 z-[2] w-3/5 overflow-hidden">
        <BlueprintOverlay />
      </div>
      <div aria-hidden="true" className="home-reflection pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-1/3" />

      <div className="home-hero-content relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-5 text-center sm:px-8">
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="home-hero-title max-w-5xl font-bold text-foreground"
        >
          {lang === "fr" ? (
            <span className="block">
              <span className="sm:hidden">Trouvez le bon<br />entrepreneur.</span>
              <span className="hidden sm:inline">{copy.lineOne}</span>
            </span>
          ) : (
            <span className="block">{copy.lineOne}</span>
          )}
          {lang === "fr" ? (
            <span className="mt-1 block text-primary">
              <span className="sm:hidden">Pas trois<br />soumissions.</span>
              <span className="hidden sm:inline">{copy.lineTwo}</span>
            </span>
          ) : (
            <span className="mt-1 block text-primary">{copy.lineTwo}</span>
          )}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="home-hero-subtitle mx-auto max-w-3xl text-muted-foreground"
        >
          {copy.subtitle}
        </motion.p>

        <ClaraConversationBox />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.3 }}
          className="home-trust-glass inline-flex items-center gap-2 rounded-full border border-border text-sm font-medium text-foreground"
        >
          <BadgeCheck className="h-4 w-4 text-primary" aria-hidden="true" />
          {copy.trust}
        </motion.div>
      </div>
    </section>
  );
}
