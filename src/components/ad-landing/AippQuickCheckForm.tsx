import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Building2, MapPin, Globe, Phone, Search } from "lucide-react";
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

export default function AippQuickCheckForm({ onSubmit, isLoading }: AippQuickCheckFormProps) {
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [googleUrl, setGoogleUrl] = useState("");

  const canSubmit = businessName.trim().length >= 2 && city.trim().length >= 2;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;
    onSubmit({
      business_name: businessName.trim(),
      city: city.trim(),
      website_url: website.trim(),
      phone: phone.trim(),
      google_profile_url: googleUrl.trim(),
    });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4 w-full max-w-md mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="space-y-3">
        <div>
          <Label htmlFor="biz-name" className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
            <Building2 className="h-3.5 w-3.5 text-primary" /> Nom d'entreprise *
          </Label>
          <Input
            id="biz-name"
            placeholder="Ex: Rénovation Martin Inc."
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="h-11"
            required
          />
        </div>
        <div>
          <Label htmlFor="biz-city" className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
            <MapPin className="h-3.5 w-3.5 text-primary" /> Ville *
          </Label>
          <Input
            id="biz-city"
            placeholder="Ex: Montréal"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="h-11"
            required
          />
        </div>
        <div>
          <Label htmlFor="biz-web" className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" /> Site web <span className="text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Input
            id="biz-web"
            placeholder="https://..."
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="biz-phone" className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" /> Téléphone <span className="text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Input
            id="biz-phone"
            placeholder="514-..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <Label htmlFor="biz-google" className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-1.5">
            <Search className="h-3.5 w-3.5 text-muted-foreground" /> Fiche Google <span className="text-muted-foreground font-normal">(optionnel)</span>
          </Label>
          <Input
            id="biz-google"
            placeholder="URL Google Maps..."
            value={googleUrl}
            onChange={(e) => setGoogleUrl(e.target.value)}
            className="h-11"
          />
        </div>
      </div>

      <Button type="submit" size="lg" className="w-full h-12 text-base font-bold" disabled={!canSubmit || isLoading}>
        {isLoading ? "Analyse en cours..." : "Voir mon score gratuit"}
        {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
      </Button>
      <p className="text-xs text-muted-foreground text-center">
        Gratuit • 30 secondes • Aucun engagement
      </p>
    </motion.form>
  );
}
