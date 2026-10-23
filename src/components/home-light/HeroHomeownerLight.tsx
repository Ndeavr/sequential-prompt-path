/** ONE CLARA — minimal, conversation-first homepage. */
import { useState } from "react";

import UnproLogo from "@/components/brand/UnproLogo";
import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";
import { useLanguage } from "@/components/ui/LanguageToggle";

export default function HeroHomeownerLight() {
  const { lang } = useLanguage();
  const [isConversationActive, setIsConversationActive] = useState(false);
  // Hauteur visible publiée globalement par useKeyboardAwareViewport (App).
  const copy = lang === "fr"
    ? {
        eyebrow: "Projet résidentiel",
        lead: "Un projet de",
        accent: "rénovation",
        tail: "en tête?",
        title: "Un projet de rénovation en tête?",
      }
    : {
        eyebrow: "Home project",
        lead: "Have a",
        accent: "renovation project",
        tail: "in mind?",
        title: "Have a renovation project in mind?",
      };

  return (
    <section className={`home-glossy-hero relative isolate${isConversationActive ? " is-conversation-active" : ""}`}>
      <div aria-hidden="true" className="home-clara-ambient" />
      <div className="home-hero-content relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-5 text-center sm:px-8">
        {!isConversationActive && (
          <div className="home-hero-intro" lang={lang}>
            <div className="home-hero-badge">
              <span aria-hidden="true" className="home-hero-badge-mark">
                <UnproLogo
                  animated={false}
                  markShape="bare"
                  showWordmark={false}
                  size={52}
                  tone="dark"
                  unsized
                />
              </span>
              <span className="home-hero-badge-copy">
                <span className="home-hero-badge-kicker">
                  <span>UNPRO</span>
                  <i aria-hidden="true" />
                  {copy.eyebrow}
                </span>
                <h1 aria-label={copy.title} className="home-hero-title font-semibold text-foreground">
                  <span>{copy.lead} </span>
                  <strong>{copy.accent}</strong>
                  <span> {copy.tail}</span>
                </h1>
              </span>
            </div>
          </div>
        )}

        <ClaraConversationBox surface="home" onConversationActiveChange={setIsConversationActive} />
      </div>
    </section>
  );
}
