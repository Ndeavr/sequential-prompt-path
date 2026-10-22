/** ONE CLARA — minimal, conversation-first homepage. */
import { useState } from "react";

import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";

export default function HeroHomeownerLight() {
  const [isConversationActive, setIsConversationActive] = useState(false);
  // Hauteur visible publiée globalement par useKeyboardAwareViewport (App).
  const copy = {
    title: "Un projet en tête ?",
  };

  return (
    <section className={`home-glossy-hero relative isolate${isConversationActive ? " is-conversation-active" : ""}`}>
      <div aria-hidden="true" className="home-clara-ambient" />
      <div className="home-hero-content relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center px-5 text-center sm:px-8">
        {!isConversationActive && (
          <div className="home-hero-intro">
            <h1 className="home-hero-title max-w-5xl font-semibold text-foreground">
              {copy.title}
            </h1>
          </div>
        )}

        <ClaraConversationBox surface="home" onConversationActiveChange={setIsConversationActive} />
      </div>
    </section>
  );
}
