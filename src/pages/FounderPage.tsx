/**
 * UNPRO — Founder Private Page
 * PIN-locked access with blurred background content.
 * Bilingual FR/EN support.
 */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/components/ui/LanguageToggle";
import FounderLockScreen from "@/components/founder/FounderLockScreen";
import FounderContent from "@/components/founder/FounderContent";

const t = {
  title: { fr: "Accès Fondateur — UNPRO", en: "Founder Access — UNPRO" },
  privateAccess: { fr: "Accès privé", en: "Private access" },
  needsInvite: {
    fr: "Cette page nécessite un lien d'invitation valide.",
    en: "This page requires a valid invitation link.",
  },
};

export default function FounderPage() {
  const { lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("founder_access");
    if (stored) {
      try {
        const parsed = JSON.parse(atob(stored));
        if (parsed.exp > Date.now() && parsed.ref === refCode) {
          setUnlocked(true);
        } else {
          sessionStorage.removeItem("founder_access");
        }
      } catch {
        sessionStorage.removeItem("founder_access");
      }
    }
  }, [refCode]);

  const handleUnlock = (accessToken: string) => {
    sessionStorage.setItem("founder_access", accessToken);
    setUnlocked(true);
  };

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <title>{t.title[lang]}</title>
      </Helmet>
      <div className="relative min-h-screen bg-background">
        <div className={unlocked ? "" : "blur-md pointer-events-none select-none"}>
          <FounderContent />
        </div>

        <AnimatePresence>
          {!unlocked && refCode && (
            <FounderLockScreen refCode={refCode} onUnlock={handleUnlock} />
          )}
        </AnimatePresence>

        {!refCode && !unlocked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
            <div className="text-center space-y-4 p-8">
              <h1 className="text-2xl font-bold text-foreground">{t.privateAccess[lang]}</h1>
              <p className="text-muted-foreground">{t.needsInvite[lang]}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
