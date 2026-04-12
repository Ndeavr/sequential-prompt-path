import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Globe, Phone, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface AippQuickCheckFormProps {
  onSubmit: (data: {
    business_name: string;
    city: string;
    website_url: string;
    phone: string;
    google_profile_url: string;
  }) => void;
  isLoading?: boolean;
}

/** Normalize any user-typed URL into a clean domain */
function normalizeUrl(raw: string): string {
  let v = raw.trim().replace(/\s+/g, ""); // remove all spaces
  if (!v) return "";
  // Remove protocol fragments like "http:", "https//", "http:/", etc.
  v = v.replace(/^(https?)?:?\/?\/*/i, "");
  // Remove trailing slashes
  v = v.replace(/\/+$/, "");
  return v;
}

function looksLikeUrl(raw: string): boolean {
  const normalized = normalizeUrl(raw);
  // Must have a dot and at least 2 char TLD
  return /^[\w.-]+\.\w{2,}/.test(normalized);
}

function looksLikePhone(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10;
}

export default function AippQuickCheckForm({ onSubmit, isLoading }: AippQuickCheckFormProps) {
  const [input, setInput] = useState("");
  const [inputType, setInputType] = useState<"unknown" | "website" | "phone">("unknown");

  // Auto-detect input type
  useEffect(() => {
    const v = input.trim();
    if (!v) { setInputType("unknown"); return; }
    if (looksLikePhone(v)) { setInputType("phone"); return; }
    if (looksLikeUrl(v)) { setInputType("website"); return; }
    setInputType("unknown");
  }, [input]);

  const canSubmit = inputType === "website" || inputType === "phone";

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;

    const websiteUrl = inputType === "website" ? normalizeUrl(input) : "";
    const phone = inputType === "phone" ? input.trim() : "";

    onSubmit({
      business_name: "", // will be detected from scrape
      city: "",          // will be detected from scrape
      website_url: websiteUrl ? `https://${websiteUrl}` : "",
      phone,
      google_profile_url: "",
    });
  }, [canSubmit, isLoading, input, inputType, onSubmit]);

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4 w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div>
        <Label htmlFor="aipp-input" className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
          {inputType === "phone" ? (
            <Phone className="h-3.5 w-3.5 text-primary" />
          ) : (
            <Globe className="h-3.5 w-3.5 text-primary" />
          )}
          Site web ou téléphone
        </Label>
        <Input
          id="aipp-input"
          placeholder="Ex: monentreprise.ca ou 514-555-1234"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-12 text-base"
          autoFocus
        />
        {input.trim() && !canSubmit && (
          <p className="text-xs text-muted-foreground mt-1.5">
            Entrez un site web (ex: monsite.ca) ou un numéro de téléphone (10 chiffres)
          </p>
        )}
        {canSubmit && (
          <p className="text-xs text-primary mt-1.5 font-medium">
            {inputType === "website" ? "🌐 Site web détecté" : "📞 Téléphone détecté"} — prêt pour l'analyse
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full h-12 text-base font-bold" disabled={!canSubmit || isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse en cours...
          </>
        ) : (
          <>
            Analyser gratuitement <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Gratuit • Résultat instantané • Aucun engagement
      </p>
    </motion.form>
  );
}
