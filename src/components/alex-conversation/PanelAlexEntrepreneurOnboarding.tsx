/**
 * PanelAlexEntrepreneurOnboarding — Inline onboarding form in Alex chat.
 * Collects business name, phone, service category before checkout.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, ArrowRight, User, Phone, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  onComplete: (data: { businessName: string; contactName: string; phone: string; service: string }) => void;
  prefilled?: { businessName?: string; contactName?: string; phone?: string; service?: string };
}

const SERVICES = [
  "Plomberie", "Électricité", "Toiture", "Rénovation générale",
  "Peinture", "Chauffage / Climatisation", "Fondation",
  "Portes et fenêtres", "Isolation", "Décontamination",
  "Aménagement paysager", "Autre",
];

export default function PanelAlexEntrepreneurOnboarding({ onComplete, prefilled }: Props) {
  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState(prefilled?.businessName || "");
  const [contactName, setContactName] = useState(prefilled?.contactName || "");
  const [phone, setPhone] = useState(prefilled?.phone || "");
  const [service, setService] = useState(prefilled?.service || "");

  const steps = [
    {
      label: "Nom de votre entreprise",
      icon: <Building2 className="w-4 h-4" />,
      content: (
        <Input
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="Ex: Plomberie Dupont Inc."
          className="bg-background/80 border-border/40"
          autoFocus
        />
      ),
      valid: businessName.trim().length >= 2,
    },
    {
      label: "Votre nom",
      icon: <User className="w-4 h-4" />,
      content: (
        <Input
          value={contactName}
          onChange={e => setContactName(e.target.value)}
          placeholder="Prénom Nom"
          className="bg-background/80 border-border/40"
          autoFocus
        />
      ),
      valid: contactName.trim().length >= 2,
    },
    {
      label: "Téléphone",
      icon: <Phone className="w-4 h-4" />,
      content: (
        <Input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="(514) 000-0000"
          type="tel"
          className="bg-background/80 border-border/40"
          autoFocus
        />
      ),
      valid: phone.trim().length >= 7,
    },
    {
      label: "Spécialité principale",
      icon: <Wrench className="w-4 h-4" />,
      content: (
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.map(s => (
            <button
              key={s}
              onClick={() => setService(s)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200 ${
                service === s
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 border border-border/40 text-foreground hover:bg-primary/10 hover:border-primary/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      ),
      valid: service.length > 0,
    },
  ];

  const current = steps[step];
  const isLast = step === steps.length - 1;

  const handleNext = () => {
    if (isLast && current.valid) {
      onComplete({ businessName, contactName, phone, service });
    } else if (current.valid) {
      setStep(step + 1);
    }
  };

  return (
    <motion.div
      initial={{ y: 10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-4 space-y-4"
    >
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Inscription entrepreneur</h4>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5 justify-center">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? "w-6 bg-primary" : i < step ? "w-3 bg-primary/50" : "w-3 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Current step */}
      <motion.div
        key={step}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          {current.icon}
          <span className="text-xs font-medium">{current.label}</span>
        </div>
        {current.content}
      </motion.div>

      <Button
        onClick={handleNext}
        disabled={!current.valid}
        className="w-full h-10 text-sm gap-2"
        size="sm"
      >
        {isLast ? "Continuer vers le paiement" : "Suivant"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
