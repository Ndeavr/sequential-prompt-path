/**
 * UNPRO — Founder Lock Screen
 * Glassmorphism overlay with 4-digit PIN input.
 */
import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface FounderLockScreenProps {
  refCode: string;
  onUnlock: (accessToken: string) => void;
}

export default function FounderLockScreen({ refCode, onUnlock }: FounderLockScreenProps) {
  const [pin, setPin] = useState(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [locked, setLocked] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = useCallback((index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const digit = value.slice(-1);
    setPin(prev => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    setError(null);
    if (digit && index < 3) {
      inputs.current[index + 1]?.focus();
    }
  }, []);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }, [pin]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      setPin(pasted.split(""));
      inputs.current[3]?.focus();
    }
  }, []);

  const handleSubmit = async () => {
    const code = pin.join("");
    if (code.length !== 4) {
      setError("Entrez les 4 chiffres");
      return;
    }
    if (locked) {
      setError("Trop de tentatives. Réessayez dans 15 minutes.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("founder-pin-verify", {
        body: { referral_code: refCode, pin: code },
      });

      if (fnError || !data?.success) {
        const errData = data || {};
        if (errData.locked) {
          setLocked(true);
        }
        if (errData.remaining_attempts !== undefined) {
          setRemaining(errData.remaining_attempts);
        }
        setError(errData.error || "Code incorrect");
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setPin(["", "", "", ""]);
        inputs.current[0]?.focus();
      } else {
        onUnlock(data.access_token);
      }
    } catch {
      setError("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const fullPin = pin.join("");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Glassmorphism card */}
      <motion.div
        animate={shake ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 space-y-6"
      >
        {/* Icon */}
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-white">Accès privé</h2>
          <p className="text-sm text-white/60 leading-relaxed">
            Ce lien nécessite un code à 4 chiffres transmis par votre contact.
          </p>
        </div>

        {/* PIN inputs */}
        <div className="flex justify-center gap-3" onPaste={handlePaste}>
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => { inputs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              autoFocus={i === 0}
              disabled={locked}
              className="h-14 w-14 rounded-xl border border-white/20 bg-white/10 text-center text-2xl font-bold text-white 
                         placeholder:text-white/20 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none
                         transition-all duration-200 disabled:opacity-40"
              placeholder="·"
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 justify-center text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            {remaining !== null && remaining > 0 && (
              <span className="text-white/40">({remaining} essai{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""})</span>
            )}
          </motion.div>
        )}

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={fullPin.length < 4 || loading || locked}
          className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm gap-2"
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Déverrouiller l'accès
            </>
          )}
        </Button>

        {/* Footer */}
        <p className="text-center text-[11px] text-white/30">
          Le code est personnel et ne doit pas être partagé publiquement.
        </p>
      </motion.div>
    </motion.div>
  );
}
