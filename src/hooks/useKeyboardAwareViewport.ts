/**
 * UNPRO — Clavier mobile, pour TOUTE l'application.
 *
 * Android Chrome/Gboard et iOS Safari ne rétrécissent pas toujours `dvh` à
 * l'ouverture du clavier. On publie la hauteur réellement visible dans
 * `--app-visible-height` (et `--clara-visible-height`, rétrocompatible) et
 * `data-keyboard-open` sur <html>. Au redimensionnement :
 *  - le champ actif (formulaire, onboarding, auth) revient au-dessus du clavier;
 *  - un fil de conversation déjà près du bas y reste (lecture manuelle préservée).
 * Jamais de défilement forcé quand l'utilisateur consulte d'anciens messages.
 */
import { useEffect } from "react";

const NEAR_BOTTOM_PX = 140;
const SCROLLERS = ".home-clara-conversation > div, [data-chat-scroller]";

export function isEditable(el: Element | null): el is HTMLElement {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["button", "checkbox", "radio", "submit", "reset", "file", "range", "color"].includes(el.type);
  }
  return el instanceof HTMLSelectElement;
}

export function useKeyboardAwareViewport() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    const root = document.documentElement;
    const baseline = { height: window.innerHeight };
    const nearBottom = new WeakMap<Element, boolean>();

    const rememberScrollers = () => {
      document.querySelectorAll(SCROLLERS).forEach((el) => {
        nearBottom.set(el, el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX);
      });
    };
    const onScroll = (e: Event) => {
      const t = e.target;
      if (t instanceof Element && t.matches(SCROLLERS)) {
        nearBottom.set(t, t.scrollHeight - t.scrollTop - t.clientHeight < NEAR_BOTTOM_PX);
      }
    };

    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = Math.round(vv?.height ?? window.innerHeight);
        root.style.setProperty("--app-visible-height", `${h}px`);
        root.style.setProperty("--clara-visible-height", `${h}px`);
        baseline.height = Math.max(baseline.height, window.innerHeight);
        const open = baseline.height - h > 120;
        if (open) root.setAttribute("data-keyboard-open", "true");
        else root.removeAttribute("data-keyboard-open");

        // Fil de conversation : rester ancré en bas seulement s'il l'était.
        document.querySelectorAll(SCROLLERS).forEach((el) => {
          if (nearBottom.get(el) !== false) el.scrollTop = el.scrollHeight;
        });
        // Champ actif : visible au-dessus du clavier (hors composer du chat).
        const active = document.activeElement;
        if (open && isEditable(active) && !active.closest(".home-clara-composer")) {
          active.scrollIntoView({ block: "center", behavior: "auto" });
        }
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      rememberScrollers();
      const t = e.target as Element | null;
      if (!isEditable(t) || t.closest(".home-clara-composer")) return;
      // Le clavier arrive après le focus : on recentre une fois installé.
      window.setTimeout(() => {
        if (document.activeElement === t) (t as HTMLElement).scrollIntoView({ block: "center", behavior: "auto" });
      }, 320);
    };

    apply();
    vv?.addEventListener("resize", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("scroll", onScroll, true);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("scroll", onScroll, true);
    };
  }, []);
}
