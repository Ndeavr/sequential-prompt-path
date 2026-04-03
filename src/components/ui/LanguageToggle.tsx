import { useState, useRef, createContext, useContext, type ReactNode } from "react";
import { motion } from "framer-motion";

const STORAGE_KEY = "unpro-lang";

function detectBrowserLang(): "fr" | "en" {
  const nav = navigator.language || (navigator as any).userLanguage || "fr";
  return nav.startsWith("fr") ? "fr" : "en";
}

// ─── Shared Language Context ───
interface LanguageContextType {
  lang: "fr" | "en";
  setLang: (l: "fr" | "en") => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "fr",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<"fr" | "en">(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "fr" || stored === "en") return stored;
    } catch {}
    return detectBrowserLang();
  });

  const setLang = (l: "fr" | "en") => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  return useContext(LanguageContext);
}

// ─── Toggle Component ───
interface LanguageToggleProps {
  lang: "fr" | "en";
  onChange: (lang: "fr" | "en") => void;
  className?: string;
}

export default function LanguageToggle({ lang, onChange, className = "" }: LanguageToggleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFr = lang === "fr";

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      aria-label="Language"
      className={`relative flex h-8 w-[72px] items-center rounded-full bg-muted/60 border border-border/40 p-0.5 cursor-pointer select-none ${className}`}
    >
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 32 }}
        className="absolute top-0.5 h-[calc(100%-4px)] w-[calc(50%-2px)] rounded-full bg-primary shadow-sm"
        style={{ left: isFr ? 2 : "calc(50% + 0px)" }}
      />
      <button
        role="radio"
        aria-checked={isFr}
        onClick={() => onChange("fr")}
        className={`relative z-10 flex h-full w-1/2 items-center justify-center rounded-full text-[11px] font-bold tracking-wider transition-colors duration-200 ${
          isFr ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        FR
      </button>
      <button
        role="radio"
        aria-checked={!isFr}
        onClick={() => onChange("en")}
        className={`relative z-10 flex h-full w-1/2 items-center justify-center rounded-full text-[11px] font-bold tracking-wider transition-colors duration-200 ${
          !isFr ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}
