/**
 * UNPRO — Global Scroll Restoration Hook
 * Handles: scroll-to-top on navigation, anchor scrolling with sticky header offset,
 * and fallback to top when anchor is missing.
 */

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const STICKY_HEADER_OFFSET = 80; // px — matches SmartHeader height

export function useScrollRestoration() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    // Small delay to let the DOM render before scrolling
    const frame = requestAnimationFrame(() => {
      if (hash) {
        const id = hash.replace("#", "");
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - STICKY_HEADER_OFFSET;
          window.scrollTo({ top, behavior: "smooth" });
        } else {
          // Missing anchor → scroll to top
          window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
        }
      } else {
        // No hash → always scroll to top
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [pathname, hash, key]);
}
