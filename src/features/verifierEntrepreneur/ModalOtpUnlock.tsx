/**
 * ModalOtpUnlock — Anonymous → authenticated bridge for verification reports.
 *
 * The user chooses email OR SMS OTP. After Supabase confirms the sign-in,
 * the parent page (`/verifier-entrepreneur`) detects the new session and
 * calls the `verify-attach-anonymous` edge function to rattach the
 * anonymous run to the freshly authenticated homeowner.
 *
 * When the user comes back through an email magic-link, they land on
 * `/verifier-entrepreneur?resume=<runId>&vid=<visitor_id>` and the same
 * attach flow runs there.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, MessageSquare, ArrowLeft, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  runId?: string;
  visitorId: string;
}

type Mode = "choose" | "email" | "sms" | "sms_verify";

export default function ModalOtpUnlock({ open, onOpenChange, runId, visitorId }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const redirect =
    typeof window !== "undefined"
      ? `${window.location.origin}/verifier-entrepreneur?resume=${encodeURIComponent(runId ?? "")}&vid=${encodeURIComponent(visitorId)}`
      : undefined;

  const reset = () => {
    setMode("choose");
    setEmail("");
    setPhone("");
    setCode("");
    setBusy(false);
  };

  const sendEmail = async () => {
    if (!email.trim() || !email.includes("@")) {
      toast.error("Entrez une adresse courriel valide.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: redirect },
      });
      if (error) throw error;
      toast.success("Lien envoyé. Vérifiez votre boîte de réception.");
      onOpenChange(false);
      reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setBusy(false);
    }
  };

  const sendSms = async () => {
    const clean = phone.replace(/\D/g, "");
    if (clean.length < 10) {
      toast.error("Entrez un numéro mobile valide.");
      return;
    }
    setBusy(true);
    try {
      const e164 = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      toast.success("Code envoyé par SMS.");
      setMode("sms_verify");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi SMS impossible");
    } finally {
      setBusy(false);
    }
  };

  const verifySms = async () => {
    if (code.trim().length < 4) {
      toast.error("Entrez le code reçu par SMS.");
      return;
    }
    setBusy(true);
    try {
      const clean = phone.replace(/\D/g, "");
      const e164 = clean.startsWith("1") ? `+${clean}` : `+1${clean}`;
      const { error } = await supabase.auth.verifyOtp({
        phone: e164,
        token: code.trim(),
        type: "sms",
      });
      if (error) throw error;
      toast.success("Connexion réussie.");
      onOpenChange(false);
      reset();
      // The parent page's auth listener will detect the session and trigger the attach flow.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Code invalide");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Débloquer le rapport
          </DialogTitle>
          <DialogDescription>
            Choisissez votre méthode de connexion. Aucun mot de passe.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {mode === "choose" && (
            <div className="grid gap-3">
              <Button
                variant="outline"
                className="h-12 justify-start gap-3"
                onClick={() => setMode("email")}
              >
                <Mail className="w-4 h-4" />
                <span className="font-medium">Recevoir un lien par courriel</span>
              </Button>
              <Button
                variant="outline"
                className="h-12 justify-start gap-3"
                onClick={() => setMode("sms")}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="font-medium">Recevoir un code par SMS</span>
              </Button>
            </div>
          )}

          {mode === "email" && (
            <div className="space-y-3">
              <Label htmlFor="otp_email">Courriel</Label>
              <Input
                id="otp_email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
              />
              <p className="text-xs text-muted-foreground">
                On vous renvoie automatiquement vers votre rapport après connexion.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
                <Button className="flex-1" onClick={sendEmail} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    "Envoyer le lien"
                  )}
                </Button>
              </div>
            </div>
          )}

          {mode === "sms" && (
            <div className="space-y-3">
              <Label htmlFor="otp_phone">Numéro mobile</Label>
              <Input
                id="otp_phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="514-555-0101"
              />
              <div className="flex items-center gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
                <Button className="flex-1" onClick={sendSms} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi…
                    </>
                  ) : (
                    "Envoyer le code"
                  )}
                </Button>
              </div>
            </div>
          )}

          {mode === "sms_verify" && (
            <div className="space-y-3">
              <Label htmlFor="otp_code">Code reçu par SMS</Label>
              <Input
                id="otp_code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={8}
              />
              <div className="flex items-center gap-2 pt-1">
                <Button variant="ghost" size="sm" onClick={() => setMode("sms")}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour
                </Button>
                <Button className="flex-1" onClick={verifySms} disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Vérification…
                    </>
                  ) : (
                    "Confirmer"
                  )}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
