/**
 * AlexContactCapture — Inline contact capture card shown in conversation.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Mail, User, Send, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { supabase } from "@/integrations/supabase/client";
import { cleanTextField } from "@/utils/cleanInput";
import { phoneToE164 } from "@/utils/formatPhone";
import { formatEmail } from "@/utils/formatEmail";

interface AlexContactCaptureProps {
  sessionToken: string;
  onCaptured: (data: { firstName: string; phone: string; email?: string }) => void;
}

export default function AlexContactCapture({ sessionToken, onCaptured }: AlexContactCaptureProps) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    const cleanName = cleanTextField(firstName);
    const cleanPhone = phoneToE164(phone) || phone.trim();
    const cleanEmail = email.trim() ? formatEmail(email) : null;
    if (!cleanName || !cleanPhone) return;
    setIsSaving(true);

    try {
      await supabase.functions.invoke("alex-capture-contact", {
        body: {
          session_id: sessionToken,
          first_name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
        },
      });

      setDone(true);
      onCaptured({ firstName: cleanName, phone: cleanPhone, email: cleanEmail || undefined });
    } catch (err) {
      console.error("[AlexContactCapture] error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-success/25 bg-success/[0.06] p-4 text-center space-y-1"
      >
        <p className="text-sm font-bold text-foreground">Parfait, {cleanTextField(firstName)}!</p>
        <p className="text-[11px] text-muted-foreground">Je m'occupe du reste pour vous.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-4 space-y-3"
    >
      <p className="text-xs font-bold text-foreground">Vos coordonnées</p>
      <p className="text-[10px] text-muted-foreground">Pour que je puisse confirmer votre rendez-vous.</p>

      <div className="space-y-2">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
          <Input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            onBlur={() => setFirstName(cleanTextField(firstName))}
            placeholder="Prénom"
            className="pl-9 rounded-xl text-sm h-10"
          />
        </div>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
          <PhoneInput
            value={phone}
            onChange={setPhone}
            placeholder="Téléphone"
            className="pl-9 rounded-xl text-sm h-10"
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
          <EmailInput
            value={email}
            onChange={setEmail}
            placeholder="Courriel (optionnel)"
            className="pl-9 rounded-xl text-sm h-10"
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!cleanTextField(firstName) || !phone.trim() || isSaving}
        className="w-full rounded-xl h-10 text-xs font-bold bg-gradient-to-r from-primary to-accent text-white border-0 gap-1.5"
      >
        <Send className="w-3 h-3" />
        {isSaving ? "Envoi…" : "Confirmer"}
      </Button>

      <p className="text-[9px] text-muted-foreground/50 text-center flex items-center justify-center gap-1">
        <Shield className="w-2.5 h-2.5" /> Vos données restent confidentielles.
      </p>
    </motion.div>
  );
}
