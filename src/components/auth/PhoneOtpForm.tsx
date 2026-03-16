/**
 * UNPRO — Phone OTP Authentication
 * Uses Supabase native phone OTP. Canada default.
 * Architecture-ready for future Twilio custom upgrade.
 */

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Phone, ArrowLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PhoneOtpFormProps {
  onSuccess?: () => void;
  loading?: boolean;
  className?: string;
}

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
  const [cooldown, setCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleSendOtp = async () => {
    const e164 = toE164(phone);
    if (e164.length < 11) {
      toast.error("Numéro de téléphone invalide");
      return;
    }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
    setSending(false);
    if (error) {
      toast.error(error.message || "Erreur d'envoi du code");
    } else {
      toast.success("Code envoyé par texto !");
      setStep("code");
      setCooldown(60);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    }
  };

  const handleVerifyOtp = async () => {
    const otp = code.join("");
    if (otp.length !== 6) {
      toast.error("Entrez le code à 6 chiffres");
      return;
    }
    setVerifying(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: toE164(phone),
      token: otp,
      type: "sms",
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message || "Code invalide ou expiré");
      setCode(["", "", "", "", "", ""]);
      codeRefs.current[0]?.focus();
    } else {
      toast.success("Connexion réussie !");
      onSuccess?.();
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 digits entered
    if (newCode.every((d) => d) && newCode.join("").length === 6) {
      setTimeout(() => handleVerifyOtp(), 100);
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    await handleSendOtp();
  };

  const isDisabled = externalLoading || sending || verifying;

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
              <Label style={{ color: "#0B1533" }}>Numéro de téléphone</Label>
              <div className="flex gap-2">
                <div
                  className="flex items-center justify-center px-3 rounded-lg text-sm font-medium shrink-0"
                  style={{ background: "hsl(220 20% 96%)", border: "1px solid #DFE9F5", color: "#0B1533" }}
                >
                  🇨🇦 +1
                </div>
                <Input
                  type="tel"
                  value={formatPhoneDisplay(phone)}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="(514) 555-1234"
                  style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                  disabled={isDisabled}
                />
              </div>
              <p className="text-xs" style={{ color: "#6C7A92" }}>
                Recevez un code à 6 chiffres par texto
              </p>
            </div>
            <Button
              type="button"
              className="w-full h-11 text-sm font-medium rounded-xl gap-2"
              style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white" }}
              disabled={isDisabled || phone.replace(/\D/g, "").length < 10}
              onClick={handleSendOtp}
            >
              {sending ? "Envoi…" : (
                <>
                  <Phone className="h-4 w-4" />
                  Recevoir mon code
                </>
              )}
            </Button>
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
              <p className="text-sm font-medium" style={{ color: "#0B1533" }}>
                Code envoyé au +1 {formatPhoneDisplay(phone)}
              </p>
              <p className="text-xs mt-1" style={{ color: "#6C7A92" }}>
                Entrez le code à 6 chiffres reçu par texto
              </p>
            </div>

            {/* 6-digit code input */}
            <div className="flex justify-center gap-2">
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
                  className="w-11 h-12 text-center text-lg font-bold rounded-lg"
                  style={{ background: "white", border: "1px solid #DFE9F5", color: "#0B1533" }}
                  disabled={isDisabled}
                />
              ))}
            </div>

            <Button
              type="button"
              className="w-full h-11 text-sm font-medium rounded-xl"
              style={{ background: "linear-gradient(135deg, #2563EB, #3B82F6)", color: "white" }}
              disabled={isDisabled || code.some((d) => !d)}
              onClick={handleVerifyOtp}
            >
              {verifying ? "Vérification…" : "Vérifier le code"}
            </Button>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep("phone"); setCode(["", "", "", "", "", ""]); }}
                className="text-xs flex items-center gap-1 hover:underline"
                style={{ color: "#3F7BFF" }}
              >
                <ArrowLeft className="h-3 w-3" /> Changer de numéro
              </button>
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0}
                className="text-xs flex items-center gap-1 hover:underline disabled:opacity-50"
                style={{ color: cooldown > 0 ? "#6C7A92" : "#3F7BFF" }}
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
