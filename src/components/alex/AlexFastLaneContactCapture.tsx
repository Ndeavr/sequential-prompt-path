/**
 * AlexFastLaneContactCapture — Minimal ultra-fast contact capture.
 * Prénom + téléphone only. Natural, not a form wall.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onCapture: (firstName: string, phone: string, email?: string) => void;
  className?: string;
}

export default function AlexFastLaneContactCapture({ onCapture, className = "" }: Props) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (firstName.trim() && phone.trim()) {
      onCapture(firstName.trim(), phone.trim());
      setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`text-center p-4 ${className}`}>
        <p className="text-sm text-foreground font-medium">Parfait, {firstName} 👌</p>
        <p className="text-xs text-muted-foreground mt-1">Je garde tout ça prêt pour vous.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border border-border rounded-2xl p-4 space-y-3 ${className}`}
    >
      <p className="text-sm text-foreground">
        Je prends juste vos infos pour vous préparer ça.
      </p>
      <Input
        placeholder="Votre prénom"
        value={firstName}
        onChange={(e) => setFirstName(e.target.value)}
        className="h-10"
      />
      <Input
        placeholder="Votre téléphone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="h-10"
      />
      <Button onClick={handleSubmit} className="w-full" size="sm" disabled={!firstName.trim() || !phone.trim()}>
        C'est noté
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">
        Aucun engagement. Comme ça je peux garder votre demande prête.
      </p>
    </motion.div>
  );
}
