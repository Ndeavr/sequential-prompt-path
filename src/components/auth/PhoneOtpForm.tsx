/**
 * UNPRO — Phone OTP Authentication (Twilio Verify)
 * Premium mobile-first UI · Canada formatting · 30s resend · 5 max attempts
 */

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Phone, ArrowLeft, RefreshCw, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { trackAuthEvent } from "@/services/auth/trackAuthEvent";
import { authDebug } from "@/services/auth/authDebugBus";
import { motion, AnimatePresence } from "framer-motion";

interface PhoneOtpFormProps {
  onSuccess?: () => void;
  loading?: boolean;
  className?: string;
}

const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;

function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  return `+${digits}`;
}

export default function PhoneOtpForm({ onSuccess, loading: externalLoading, className = "" }: PhoneOtpFormProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const callOtp = async (fnName: "send-otp" | "verify-otp", body: Record<string, string>) => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/${fnName}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    return res.json();
  };

  const handleSendOtp = async () => {
    const e164 = toE164(phone);
    if (e164.length < 12) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    if (attempts >= MAX_ATTEMPTS) {
      toast.error("Nombre maximum de tentatives atteint. Réessayez plus tard.");
      return;
    }

    setSending(true);
    authDebug.set({
      auth_step: "sms_sending",
      auth_method: "sms",
      provider: "phone",
      last_error: null,
      last_error_step: null,
    });
    // Hard 3s safety so the button never looks frozen
    const safety = window.setTimeout(() => {
      setSending(false);
      toast.error("Envoi trop long. Réessayez.");
    }, 3000);

    try {
      const data = await callOtp("send-otp", { phone: e164 });
      window.clearTimeout(safety);
      if (data.fallback) {
        authDebug.error(`SMS fallback: ${data.code ?? "unknown"}`, "sms_sending");
        toast.error("Le service SMS est temporairement indisponible. Utilisez un autre moyen de connexion.", { duration: 5000 });
        console.warn("[PhoneOtp] SMS fallback triggered:", data.code);
        return;
      }
      if (data.error) {
        authDebug.error(data.error, "sms_sending");
        toast.error(data.error);
      } else {
        trackAuthEvent("sms_sent");
        authDebug.set({ auth_step: "sms_sent" });
        toast.success("Code envoyé !");
        setStep("code");
        setCooldown(COOLDOWN_SECONDS);
        setAttempts((a) => a + 1);
        setTimeout(() => codeRefs.current[0]?.focus(), 100);
      }
    } catch (e) {
      window.clearTimeout(safety);
      authDebug.error(e, "sms_sending");
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = code.join("");
    if (otp.length !== 6) {
      toast.error("Entrez le code à 6 chiffres");
      return;
    }

    setVerifying(true);
    authDebug.set({ auth_step: "otp_verifying" });
    try {
      const data = await callOtp("verify-otp", {
        phone: toE164(phone),
        code: otp,
      });

      if (data.error) {
        authDebug.error(data.error, "otp_verifying");
        toast.error(data.error);
        setCode(["", "", "", "", "", ""]);
        codeRefs.current[0]?.focus();
        return;
      }

      // Set the session from the returned tokens
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      trackAuthEvent("sms_success");
      authDebug.set({ auth_step: "otp_verified" });
      setVerified(true);

      // Brief success animation then callback
      setTimeout(() => onSuccess?.(), 800);
    } catch (e) {
      authDebug.error(e, "otp_verifying");
      toast.error("Erreur réseau. Réessayez.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) codeRefs.current[index + 1]?.focus();
    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      setTimeout(() => handleVerifyOtp(), 150);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      e.preventDefault();
      const newCode = pasted.split("");
      setCode(newCode);
      codeRefs.current[5]?.focus();
      setTimeout(() => handleVerifyOtp(), 150);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    await handleSendOtp();
  };

  const isDisabled = externalLoading || sending || verifying;
  const attemptsLeft = MAX_ATTEMPTS - attempts;

  return (
    <div className={className}>
      <AnimatePresence mode="wait">
        {step === "phone" ? (
          <motion.div
            key="phone-step"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label className="text-muted-foreground text-xs">Numéro de téléphone</Label>
              <div className="flex gap-2">
                <div
                  className="flex items-center justify-center px-3 rounded-xl text-sm font-medium shrink-0 h-12"
                  style={{
                    background: "hsl(228 20% 14% / 0.85)",
                    border: "1px solid hsl(228 18% 22%)",
                    color: "white",
                  }}
                >
                  🇨🇦 +1
                </div>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  enterKeyHint="send"
                  value={formatPhoneDisplay(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="(514) 555-1234"
                  className="flex-1 h-12 px-4 rounded-xl text-[16px] outline-none transition-colors"
                  style={{
                    background: "hsl(228 20% 14% / 0.85)",
                    border: "1px solid hsl(228 18% 22%)",
                    color: "white",
                    caretColor: "hsl(222 100% 75%)",
                  }}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Recevez un code à 6 chiffres par texto
              </p>
              <style>{`
                input[type="tel"]::placeholder { color: hsl(220 14% 55%); opacity: 1; }
              `}</style>
            </div>
            <Button
              type="button"
              className="w-full h-12 text-sm font-semibold rounded-xl gap-2"
              disabled={isDisabled || phone.replace(/\D/g, "").length < 10 || attempts >= MAX_ATTEMPTS}
              onClick={handleSendOtp}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Phone className="h-4 w-4" />
                  Recevoir mon code
                </>
              )}
            </Button>
            {attempts > 0 && attemptsLeft > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                {attemptsLeft} tentative{attemptsLeft > 1 ? "s" : ""} restante{attemptsLeft > 1 ? "s" : ""}
              </p>
            )}
            {attempts >= MAX_ATTEMPTS && (
              <p className="text-xs text-center text-destructive">
                Maximum atteint. Réessayez dans quelques minutes.
              </p>
            )}
          </motion.div>
        ) : verified ? (
          <motion.div
            key="success-step"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-3 py-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle2 className="h-12 w-12 text-green-400" />
            </motion.div>
            <p className="text-sm font-medium text-foreground">Connexion réussie !</p>
          </motion.div>
        ) : (
          <motion.div
            key="code-step"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="space-y-4"
          >
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Code envoyé au +1 {formatPhoneDisplay(phone)}
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                Entrez le code à 6 chiffres reçu par texto
              </p>
            </div>

            {/* 6-digit code input */}
            <div className="flex justify-center gap-2" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => { codeRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e)}
                  className="w-11 h-13 text-center text-lg font-bold rounded-xl"
                  style={{
                    background: "hsl(228 20% 14% / 0.6)",
                    border: digit ? "1px solid hsl(222 100% 65% / 0.5)" : "1px solid hsl(228 18% 18%)",
                    color: "hsl(220 20% 93%)",
                  }}
                  disabled={isDisabled}
                />
              ))}
            </div>

            <Button
              type="button"
              className="w-full h-12 text-sm font-medium rounded-xl"
              disabled={isDisabled || code.some((d) => !d)}
              onClick={handleVerifyOtp}
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Vérifier le code"
              )}
            </Button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep("phone"); setCode(["", "", "", "", "", ""]); }}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3 w-3" /> Changer de numéro
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="text-xs flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40 disabled:hover:text-muted-foreground"
              >
                <RefreshCw className="h-3 w-3" />
                {cooldown > 0 ? `Renvoyer (${cooldown}s)` : "Renvoyer le code"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
