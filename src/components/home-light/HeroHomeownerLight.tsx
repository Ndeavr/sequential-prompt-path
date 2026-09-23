/** ONE CLARA — minimal, conversation-first homepage. */
import { useState } from "react";

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
        {!isConversationActive && (
          <div className="home-hero-intro">
            <h1 className="home-hero-title max-w-5xl font-semibold text-foreground">
              {copy.title}
            </h1>
            <p className="home-hero-subtitle mx-auto max-w-3xl text-muted-foreground">
              {copy.subtitle}
            </p>
          </div>
        )}

        <ClaraConversationBox onConversationActiveChange={setIsConversationActive} />
      </div>
    </section>
  );
}
