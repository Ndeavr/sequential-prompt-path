import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Search, ArrowRight, Loader2, Camera, Shield, Building2, Phone, CreditCard, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { ImportSource } from "./ImportSourceConnectorGrid";
import GooglePlacesAutocomplete, { type PlaceResult } from "./GooglePlacesAutocomplete";

export interface ImportFormData {
  source: ImportSource;
  url?: string;
  business_name?: string;
  phone?: string;
  city?: string;
  description?: string;
  rbq_number?: string;
  neq_number?: string;
  business_card_file?: File;
}

interface Props {
  source: ImportSource;
  onSubmit: (data: ImportFormData) => void;
  onBack: () => void;
  isLoading?: boolean;
}

const SOURCE_CONFIG: Record<ImportSource, { title: string; subtitle: string; icon: typeof Search }> = {
  business_card: { title: "Carte d'affaires", subtitle: "Prenez une photo ou téléversez une image", icon: CreditCard },
  gmb: { title: "Google Business", subtitle: "Recherchez votre entreprise sur Google Maps", icon: Search },
  website: { title: "Import depuis site web", subtitle: "Collez votre URL et on s'occupe du reste", icon: Globe },
  rbq: { title: "Licence RBQ", subtitle: "Entrez votre numéro de licence", icon: Shield },
  neq: { title: "Numéro NEQ", subtitle: "Entrez votre numéro d'entreprise du Québec", icon: Building2 },
  phone: { title: "Recherche par téléphone", subtitle: "Entrez votre numéro pour retrouver votre entreprise", icon: Phone },
};

export default function BusinessImportForm({ source, onSubmit, onBack, isLoading }: Props) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [desc, setDesc] = useState("");
  const [rbq, setRbq] = useState("");
  const [neq, setNeq] = useState("");
  const [cardFile, setCardFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const config = SOURCE_CONFIG[source];

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
      rbq_number: rbq.trim() || undefined,
      neq_number: neq.trim() || undefined,
      business_card_file: cardFile || undefined,
    });
  };

  const isValid = () => {
    switch (source) {
      case "business_card": return !!cardFile;
      case "gmb": return !!name.trim();
      case "website": return !!url.trim();
      case "rbq": return !!rbq.trim();
      case "neq": return !!neq.trim();
      case "phone": return !!phone.trim();
    }
  };

  return (
    <motion.form onSubmit={handleSubmit} className="space-y-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-primary/10 p-2.5">
              <config.icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-sm">{config.title}</h3>
              <p className="text-xs text-muted-foreground">{config.subtitle}</p>
            </div>
          </div>

          {/* ── Business Card ── */}
          {source === "business_card" && (
            <div className="space-y-3">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => setCardFile(e.target.files?.[0] || null)}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full h-24 border-dashed flex flex-col gap-2"
                onClick={() => fileRef.current?.click()}
              >
                <Camera className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {cardFile ? cardFile.name : "Prendre une photo ou choisir un fichier"}
                </span>
              </Button>
              {cardFile && (
                <div className="rounded-lg overflow-hidden border border-border">
                  <img
                    src={URL.createObjectURL(cardFile)}
                    alt="Carte d'affaires"
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}
            </div>
          )}

          {/* ── GMB (Google Maps autocomplete) ── */}
          {source === "gmb" && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Nom de votre entreprise</Label>
                <Input
                  placeholder="Ex: Toitures Dupont Inc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block text-muted-foreground">Ville (optionnel)</Label>
                <Input placeholder="Ex: Montréal" value={city} onChange={(e) => setCity(e.target.value)} className="h-10" />
              </div>
            </div>
          )}

          {/* ── Website ── */}
          {source === "website" && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">URL de votre site web</Label>
                <Input
                  placeholder="https://monentreprise.ca"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="h-11"
                  required
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1 block text-muted-foreground">
                  Nom d'entreprise <span className="text-xs">(optionnel)</span>
                </Label>
                <Input placeholder="Mon entreprise" value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
              </div>
            </div>
          )}

          {/* ── RBQ ── */}
          {source === "rbq" && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Numéro de licence RBQ</Label>
                <Input
                  placeholder="1234-5678-90"
                  value={rbq}
                  onChange={(e) => setRbq(e.target.value)}
                  className="h-11 font-mono tracking-wider"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">Format : XXXX-XXXX-XX</p>
              </div>
            </div>
          )}

          {/* ── NEQ ── */}
          {source === "neq" && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Numéro d'entreprise du Québec (NEQ)</Label>
                <Input
                  placeholder="1234567890"
                  value={neq}
                  onChange={(e) => setNeq(e.target.value)}
                  className="h-11 font-mono tracking-wider"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">10 chiffres</p>
              </div>
            </div>
          )}

          {/* ── Phone ── */}
          {source === "phone" && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold mb-1.5 block">Numéro de téléphone</Label>
                <Input
                  placeholder="514-555-1234"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 font-mono"
                  required
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={onBack} className="flex-1">Retour</Button>
        <Button type="submit" className="flex-1 h-11 font-bold" disabled={!isValid() || isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isLoading ? "Analyse..." : "Importer"} {!isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </motion.form>
  );
}
