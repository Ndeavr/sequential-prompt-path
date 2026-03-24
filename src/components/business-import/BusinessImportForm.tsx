import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Search, ArrowRight, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export interface ImportFormData {
  source: "google" | "website" | "manual";
  url?: string;
  business_name?: string;
  phone?: string;
  city?: string;
  description?: string;
}

interface Props {
  source: "google" | "website" | "manual";
  onSubmit: (data: ImportFormData) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function BusinessImportForm({ source, onSubmit, onBack, isLoading }: Props) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [desc, setDesc] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    onSubmit({
      source,
      url: url.trim() || undefined,
      business_name: name.trim() || undefined,
      phone: phone.trim() || undefined,
      city: city.trim() || undefined,
      description: desc.trim() || undefined,
    });
  };

  if (source === "google" || source === "website") {
    const label = source === "google" ? "URL de votre fiche Google Business" : "URL de votre site web";
    const placeholder = source === "google" ? "https://g.co/maps/..." : "https://monentreprise.ca";
    const Icon = source === "google" ? Search : Globe;

    return (
      <motion.form onSubmit={handleSubmit} className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-primary/10 p-2.5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">
                  {source === "google" ? "Import Google Business" : "Import depuis site web"}
                </h3>
                <p className="text-xs text-muted-foreground">Collez votre URL et on s'occupe du reste</p>
              </div>
            </div>
            <div>
              <Label htmlFor="import-url" className="text-sm font-semibold mb-1.5 block">{label}</Label>
              <Input
                id="import-url"
                placeholder={placeholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-11"
                required
              />
            </div>
            {/* Optional manual overrides */}
            <div>
              <Label htmlFor="import-name" className="text-sm font-medium mb-1 block text-muted-foreground">
                Nom d'entreprise <span className="text-xs">(optionnel, pour corriger)</span>
              </Label>
              <Input id="import-name" placeholder="Mon entreprise" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
            </div>
          </CardContent>
        </Card>
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onBack} className="flex-1">Retour</Button>
          <Button type="submit" className="flex-1 h-11 font-bold" disabled={!url.trim() || isLoading}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {isLoading ? "Analyse..." : "Importer"} {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </motion.form>
    );
  }

  // Manual entry
  return (
    <motion.form onSubmit={handleSubmit} className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardContent className="p-5 space-y-3">
          <h3 className="font-bold text-foreground text-sm mb-2">Saisie manuelle</h3>
          <div>
            <Label className="text-sm font-semibold mb-1 block">Nom d'entreprise *</Label>
            <Input placeholder="Ex: Rénovation Martin" value={name} onChange={(e) => setName(e.target.value)} className="h-11" required />
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1 block">Ville *</Label>
            <Input placeholder="Montréal" value={city} onChange={(e) => setCity(e.target.value)} className="h-11" required />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">Téléphone</Label>
            <Input placeholder="514-..." value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10" />
          </div>
          <div>
            <Label className="text-sm font-medium mb-1 block">Description</Label>
            <Textarea placeholder="Décrivez vos services..." value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
          </div>
        </CardContent>
      </Card>
      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">Retour</Button>
        <Button type="submit" className="flex-1 h-11 font-bold" disabled={!name.trim() || !city.trim() || isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Créer mon profil <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </motion.form>
  );
}
