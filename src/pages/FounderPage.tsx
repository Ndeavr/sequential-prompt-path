/**
 * UNPRO — Founder Private Page
 * PIN-locked access with blurred background content.
 */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import FounderLockScreen from "@/components/founder/FounderLockScreen";
import FounderContent from "@/components/founder/FounderContent";

export default function FounderPage() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const [unlocked, setUnlocked] = useState(false);

  // Check session storage for existing valid access
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
        <title>Accès Fondateur — UNPRO</title>
      </Helmet>
      <div className="relative min-h-screen bg-background">
        {/* Background content — always rendered, blurred when locked */}
        <div className={unlocked ? "" : "blur-md pointer-events-none select-none"}>
          <FounderContent />
        </div>

        {/* Lock overlay */}
        <AnimatePresence>
          {!unlocked && refCode && (
            <FounderLockScreen refCode={refCode} onUnlock={handleUnlock} />
          )}
        </AnimatePresence>

        {/* No ref code */}
        {!refCode && !unlocked && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95">
            <div className="text-center space-y-4 p-8">
              <h1 className="text-2xl font-bold text-foreground">Accès privé</h1>
              <p className="text-muted-foreground">
                Cette page nécessite un lien d'invitation valide.
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
