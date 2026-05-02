/**
 * UNPRO — Persistent Contractor Call Popup
 * Global popup converting contractor visitors into phone calls.
 * Two-click dismissal with 24h localStorage suppression.
 */
import { useEffect, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Phone, X } from "lucide-react";

const STORAGE_KEY = "unpro_contractor_popup_closed_at";
const SUPPRESS_MS = 24 * 60 * 60 * 1000; // 24h
const SHOW_DELAY_MS = 2500;
const PHONE_DISPLAY = "514-249-9522";
const PHONE_TEL = "tel:5142499522";

const BLOCKED_PREFIXES = ["/admin", "/dashboard", "/login", "/checkout"];

function trackEvent(eventName: string, payload: Record<string, unknown>) {
  try {
    const enriched = {
      ...payload,
      timestamp: new Date().toISOString(),
      device_type: typeof window !== "undefined" && window.innerWidth < 768 ? "mobile" : "desktop",
      source: "persistent_contractor_popup",
    };
    if (import.meta.env.DEV) console.log(`[trackEvent] ${eventName}`, enriched);
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", eventName, enriched);
    }
  } catch {
    // silent
  }
}

const PersistentContractorCallPopup = () => {
  const { pathname } = useLocation();
  const [visible, setVisible] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const isBlockedRoute = BLOCKED_PREFIXES.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isBlockedRoute) {
      setVisible(false);
      return;
    }

    // Check 24h suppression
    try {
      const closedAt = localStorage.getItem(STORAGE_KEY);
      if (closedAt) {
        const elapsed = Date.now() - parseInt(closedAt, 10);
        if (elapsed < SUPPRESS_MS) return;
      }
    } catch {
      // ignore
    }

    const timer = window.setTimeout(() => {
      // Check for critical open modals (Radix/shadcn dialogs)
      const hasOpenDialog = document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]'
      );
      if (hasOpenDialog) return;

      setVisible(true);
      trackEvent("contractor_popup_shown", { current_path: pathname });
    }, SHOW_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [pathname, isBlockedRoute]);

  const handleCloseClick = useCallback(() => {
    if (!confirmingClose) {
      setConfirmingClose(true);
      trackEvent("contractor_popup_first_close_attempt", { current_path: pathname });
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // ignore
    }
    trackEvent("contractor_popup_closed", { current_path: pathname });
    setVisible(false);
    setConfirmingClose(false);
  }, [confirmingClose, pathname]);

  const handleCallClick = useCallback(() => {
    trackEvent("contractor_popup_call_clicked", { current_path: pathname });
  }, [pathname]);

  if (!visible || isBlockedRoute) return null;

  return (
    <div
      role="dialog"
      aria-label="Inscription entrepreneur UNPRO"
      className="fixed z-[9999] pointer-events-none inset-x-0 bottom-4 px-4 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:px-0 animate-[fadeInScale_280ms_cubic-bezier(0.22,1,0.36,1)]"
      style={{
        // @ts-expect-error custom prop for keyframes
        "--tw-enter": "1",
      }}
    >
      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <div
        className="pointer-events-auto mx-auto sm:mx-0 w-[92%] sm:w-auto sm:max-w-[420px] relative overflow-hidden"
        style={{
          borderRadius: "24px",
          background:
            "linear-gradient(145deg, hsl(222 60% 8% / 0.92), hsl(222 70% 5% / 0.96))",
          backdropFilter: "blur(24px) saturate(140%)",
          WebkitBackdropFilter: "blur(24px) saturate(140%)",
          border: "1px solid hsl(210 100% 60% / 0.35)",
          boxShadow:
            "0 20px 60px -10px hsl(210 100% 50% / 0.25), 0 8px 24px -8px hsl(0 0% 0% / 0.5), inset 0 1px 0 hsl(210 100% 70% / 0.15)",
        }}
      >
        {/* Aura */}
        <div
          aria-hidden
          className="absolute -inset-px pointer-events-none"
          style={{
            borderRadius: "24px",
            background:
              "radial-gradient(circle at 20% 0%, hsl(210 100% 55% / 0.18), transparent 60%), radial-gradient(circle at 100% 100%, hsl(195 100% 50% / 0.12), transparent 55%)",
          }}
        />

        {/* Close button */}
        <button
          type="button"
          onClick={handleCloseClick}
          aria-label={confirmingClose ? "Confirmer fermeture" : "Fermer"}
          className="absolute top-3 right-3 z-10 h-8 w-8 inline-flex items-center justify-center rounded-full text-white/70 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-[hsl(210_100%_60%)] shadow-[0_0_12px_hsl(210_100%_60%)] animate-pulse" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-[hsl(210_100%_75%)] font-semibold">
              UNPRO • Entrepreneurs
            </span>
          </div>

          <h2 className="text-white text-lg sm:text-xl font-bold leading-tight mb-2">
            Entrepreneur? Inscrivez-vous sur UNPRO
          </h2>

          <p className="text-white/80 text-sm leading-relaxed mb-4">
            {confirmingClose
              ? "Êtes-vous sûr? Les secteurs sont limités par métier et par ville."
              : "Appelez maintenant pour découvrir nos services, créer votre profil entrepreneur et réserver votre secteur avant qu'il soit limité."}
          </p>

          <a
            href={PHONE_TEL}
            onClick={handleCallClick}
            className="group relative w-full inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl font-bold text-white text-[15px] transition-all duration-200 active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, hsl(210 100% 55%), hsl(220 100% 50%))",
              boxShadow:
                "0 8px 24px -6px hsl(210 100% 50% / 0.55), inset 0 1px 0 hsl(210 100% 80% / 0.4)",
            }}
          >
            <Phone className="h-4 w-4" />
            <span>Call {PHONE_DISPLAY}</span>
          </a>

          {confirmingClose && (
            <button
              type="button"
              onClick={handleCloseClick}
              className="mt-3 w-full text-center text-xs text-white/60 hover:text-white/90 transition-colors py-2"
            >
              Cliquez encore pour fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersistentContractorCallPopup;
