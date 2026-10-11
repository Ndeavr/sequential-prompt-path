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
    let baseline = window.innerHeight;
    let focusTimer = 0;
    const revealField = () => {
      const active = document.activeElement;
      if (!isEditable(active) || active.closest(".home-clara-composer")) return;
      const top = vv?.offsetTop ?? 0;
      const bottom = top + (vv?.height ?? window.innerHeight);
      const header = document.querySelector("header")?.getBoundingClientRect();
      const bounds = active.getBoundingClientRect();
      const safeTop = Math.max(top, header?.bottom ?? top) + 8;
      if (bounds.top < safeTop || bounds.bottom > bottom - 8) {
        active.scrollIntoView({ block: "nearest", behavior: "auto" });
        const updated = active.getBoundingClientRect();
        if (!active.closest('[role="dialog"]')) {
          const delta = updated.bottom > bottom - 8 ? updated.bottom - bottom + 8 : Math.min(0, updated.top - safeTop);
          if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "auto" });
        }
      }
    };

    let raf = 0;
    const apply = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const h = Math.round(vv?.height ?? window.innerHeight);
        root.style.setProperty("--app-visible-height", `${h}px`);
        root.style.setProperty("--clara-visible-height", `${h}px`);
        root.style.setProperty("--app-visible-top", `${vv?.offsetTop ?? 0}px`);
        const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
        root.style.setProperty("--app-header-height", `${headerHeight}px`);
        baseline = Math.max(baseline, window.innerHeight);
        const open = isEditable(document.activeElement) && baseline - h > 120;
        if (open) root.setAttribute("data-keyboard-open", "true");
        else root.removeAttribute("data-keyboard-open");

        revealField();
      });
    };

    const onFocusIn = (e: FocusEvent) => {
      apply();
      const t = e.target as Element | null;
      if (!isEditable(t)) return;
      window.clearTimeout(focusTimer);
      focusTimer = window.setTimeout(() => {
        if (document.activeElement === t) revealField();
      }, 320);
    };
    const onOrientation = () => { baseline = window.innerHeight; apply(); };
    const headerObserver = new ResizeObserver(apply);
    const header = document.querySelector("header");
    if (header) headerObserver.observe(header);

    apply();
    vv?.addEventListener("resize", apply);
    vv?.addEventListener("scroll", apply);
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", onOrientation);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", apply);
    return () => {
      cancelAnimationFrame(raf);
      vv?.removeEventListener("resize", apply);
      vv?.removeEventListener("scroll", apply);
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", onOrientation);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", apply);
      window.clearTimeout(focusTimer);
      headerObserver.disconnect();
      root.removeAttribute("data-keyboard-open");
      ["--app-visible-height", "--clara-visible-height", "--app-visible-top", "--app-header-height"].forEach((key) => root.style.removeProperty(key));
    };
  }, []);
}
