/** ONE CLARA — minimal, conversation-first homepage. */
import { useEffect, useState } from "react";

import ClaraConversationBox from "@/components/home-light/ClaraConversationBox";

/**
 * Clavier mobile : `dvh` ne rétrécit pas toujours à l'ouverture du clavier.
 * On publie la hauteur réellement visible dans `--clara-visible-height`
 * (sans jamais déplacer la page) pour que la zone de saisie reste au-dessus
 * du clavier. Les écouteurs sont retirés au démontage.
 */
function useVisibleViewportHeight() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty("--clara-visible-height", `${Math.round(vv.height)}px`);
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.style.removeProperty("--clara-visible-height");
    };
  }, []);
}

export default function HeroHomeownerLight() {
  const [isConversationActive, setIsConversationActive] = useState(false);
  useVisibleViewportHeight();
  const copy = {
    title: "Discutons de votre projet.",
    subtitle: "Qu’est-ce que vous voulez rénover, réparer, ou améliorer ?",
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
