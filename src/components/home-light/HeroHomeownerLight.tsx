/** ONE CLARA — minimal, conversation-first homepage. */
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";

export default function HeroHomeownerLight() {
  const [isConversationActive, setIsConversationActive] = useState(false);
  const copy = {
    title: "Discutons.",
    subtitle: "Qu’est-ce que vous voulez rénover, réparer, ou améliorer ?",
  };

  return (
    <section className={`home-glossy-hero relative isolate${isConversationActive ? " is-conversation-active" : ""}`}>
      <div aria-hidden="true" className="home-clara-ambient" />
      <div className="home-hero-content relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-5 text-center sm:px-8">
        <AnimatePresence initial={false}>
          {!isConversationActive && (
            <motion.div
              key="home-clara-intro"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, height: 0, margin: 0 }}
              transition={{ duration: 0.24 }}
              className="home-hero-intro"
            >
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="home-hero-title max-w-5xl font-semibold text-foreground"
              >
                {copy.title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.1 }}
                className="home-hero-subtitle mx-auto max-w-3xl text-muted-foreground"
              >
                {copy.subtitle}
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        <ClaraConversationBox onConversationActiveChange={setIsConversationActive} />
      </div>
    </section>
  );
}
