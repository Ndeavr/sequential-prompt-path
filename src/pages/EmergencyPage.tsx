/**
 * UNPRO — Emergency Page (Mobile-First)
 * /emergency — Ultra-fast emergency intake funnel
 */
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Camera, MessageCircle, Bot, CalendarClock, Upload, Phone, ChevronRight, Shield, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  { key: "fuite_eau", label: "💧 Fuite d'eau", icon: "💧" },
  { key: "toiture", label: "🏠 Toiture", icon: "🏠" },
  { key: "chauffage", label: "🔥 Chauffage", icon: "🔥" },
  { key: "electricite", label: "⚡ Électricité", icon: "⚡" },
  { key: "plomberie", label: "🔧 Plomberie", icon: "🔧" },
  { key: "infiltration", label: "💦 Infiltration", icon: "💦" },
  { key: "structure", label: "🧱 Structure", icon: "🧱" },
  { key: "autre", label: "📋 Autre", icon: "📋" },
];

const INTENT_SCORES: Record<string, number> = {
  emergency_clicked: 20,
  category_selected: 10,
  photo_uploaded: 25,
  chat_started: 15,
  urgent_keywords: 20,
  booking_clicked: 30,
  callback_requested: 25,
};

export default function EmergencyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState<"hero" | "intake" | "submitting" | "done">("hero");
  const [category, setCategory] = useState<string>("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [whenStarted, setWhenStarted] = useState("");
  const [gettingWorse, setGettingWorse] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredContact, setPreferredContact] = useState("chat");
  const [asapRequested, setAsapRequested] = useState(false);
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [intentScore, setIntentScore] = useState(INTENT_SCORES.emergency_clicked);

  const addIntent = useCallback((key: string) => {
    setIntentScore(prev => prev + (INTENT_SCORES[key] || 0));
  }, []);

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    addIntent("category_selected");
    setStep("intake");
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 10 - photos.length);
    if (!files.length) return;
    addIntent("photo_uploaded");
    setPhotos(prev => [...prev, ...files]);
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreviews(prev => [...prev, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removePhoto = (idx: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Connexion requise", description: "Connectez-vous pour soumettre votre urgence.", variant: "destructive" });
      navigate("/login?redirect=/emergency");
      return;
    }

    setStep("submitting");

    try {
      // Upload photos
      const photoUrls: string[] = [];
      for (const file of photos) {
        const path = `emergency/${user.id}/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("property-photos").upload(path, file);
        if (!error) photoUrls.push(path);
      }

      const { error } = await supabase.from("emergency_requests").insert({
        user_id: user.id,
        category: category || "autre",
        description,
        when_started: whenStarted,
        getting_worse: gettingWorse,
        address,
        phone,
        preferred_contact: preferredContact,
        asap_requested: asapRequested,
        callback_requested: callbackRequested,
        intent_score: intentScore,
        photo_urls: photoUrls,
        status: "new",
      });

      if (error) throw error;

      setStep("done");
      toast({ title: "Urgence soumise ✅", description: "Nous cherchons le meilleur entrepreneur pour vous." });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setStep("intake");
    }
  };

  const getIntentLevel = () => {
    if (intentScore >= 120) return { label: "Critique", color: "bg-destructive" };
    if (intentScore >= 70) return { label: "Élevé", color: "bg-warning" };
    if (intentScore >= 30) return { label: "Moyen", color: "bg-primary" };
    return { label: "Bas", color: "bg-muted" };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Emergency Header */}
      <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-3 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <span className="text-sm font-semibold text-destructive">Mode Urgence</span>
        <Badge variant="outline" className="ml-auto text-xs">{getIntentLevel().label}</Badge>
      </div>

      <div className="max-w-lg mx-auto px-4 pb-8">
        <AnimatePresence mode="wait">
          {/* HERO STEP */}
          {step === "hero" && (
            <motion.div key="hero" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="pt-8 pb-6 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                <h1 className="text-2xl font-bold text-foreground mb-2">Urgence à la maison ?</h1>
                <p className="text-muted-foreground text-sm">On vous connecte au bon expert en quelques minutes.</p>
              </div>

              {/* Primary Actions */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { icon: Camera, label: "Envoyer photo", action: () => document.getElementById("photo-input")?.click() },
                  { icon: MessageCircle, label: "Décrire le problème", action: () => setStep("intake") },
                  { icon: Bot, label: "Parler à Alex", action: () => { addIntent("chat_started"); navigate("/alex?mode=emergency"); }},
                  { icon: CalendarClock, label: "RDV maintenant", action: () => { addIntent("booking_clicked"); setAsapRequested(true); setStep("intake"); }},
                ].map((item, i) => (
                  <Card key={i} className="p-4 cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98]" onClick={item.action}>
                    <item.icon className="w-6 h-6 text-primary mb-2" />
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                  </Card>
                ))}
              </div>

              <input id="photo-input" type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={(e) => { handlePhotoUpload(e); setStep("intake"); }} />

              {/* Category Chips */}
              <div className="mb-6">
                <p className="text-sm font-medium text-foreground mb-3">Type de problème :</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => handleCategorySelect(cat.key)}
                      className={`px-3 py-2 rounded-full text-sm font-medium border transition-all active:scale-95 ${
                        category === cat.key
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* INTAKE STEP */}
          {step === "intake" && (
            <motion.div key="intake" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="pt-6 space-y-5">
              <button onClick={() => setStep("hero")} className="text-sm text-muted-foreground flex items-center gap-1">
                ← Retour
              </button>

              {/* Category (if not set) */}
              {!category && (
                <div>
                  <Label className="text-sm font-medium">Type de problème</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {CATEGORIES.map(cat => (
                      <button key={cat.key} onClick={() => { setCategory(cat.key); addIntent("category_selected"); }}
                        className="px-3 py-2 rounded-full text-xs border bg-card hover:border-primary/40 transition-all">
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {category && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{CATEGORIES.find(c => c.key === category)?.label}</Badge>
                  <button onClick={() => setCategory("")} className="text-xs text-muted-foreground">Changer</button>
                </div>
              )}

              {/* Photo Upload */}
              <div>
                <Label className="text-sm font-medium">📷 Photos ({photos.length}/10)</Label>
                <div className="mt-2 grid grid-cols-4 gap-2">
                  {photoPreviews.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                        <X className="w-3 h-3 text-destructive-foreground" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 10 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                      <span className="text-[10px] text-muted-foreground">Ajouter</span>
                      <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="desc" className="text-sm font-medium">Décrivez le problème</Label>
                <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="Ex: Fuite d'eau au plafond de la cuisine, ça coule beaucoup..." className="mt-1" rows={3} />
              </div>

              {/* When started */}
              <div>
                <Label htmlFor="when" className="text-sm font-medium">Quand ça a commencé ?</Label>
                <Input id="when" value={whenStarted} onChange={e => setWhenStarted(e.target.value)}
                  placeholder="Ex: Ce matin, hier soir..." className="mt-1" />
              </div>

              {/* Getting worse */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Ça empire ?</Label>
                <Switch checked={gettingWorse} onCheckedChange={setGettingWorse} />
              </div>

              {/* Address + Phone */}
              <div>
                <Label htmlFor="addr" className="text-sm font-medium">Adresse</Label>
                <Input id="addr" value={address} onChange={e => setAddress(e.target.value)} placeholder="123 rue Principale, Montréal" className="mt-1" />
              </div>
              <div>
                <Label htmlFor="ph" className="text-sm font-medium">Téléphone</Label>
                <Input id="ph" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="514-555-1234" className="mt-1" />
              </div>

              {/* Contact preference */}
              <div>
                <Label className="text-sm font-medium">Préférence de contact</Label>
                <RadioGroup value={preferredContact} onValueChange={setPreferredContact} className="flex gap-4 mt-2">
                  {[{ v: "call", l: "📞 Appel" }, { v: "sms", l: "💬 SMS" }, { v: "chat", l: "🤖 Chat" }].map(o => (
                    <label key={o.v} className="flex items-center gap-2 cursor-pointer">
                      <RadioGroupItem value={o.v} />
                      <span className="text-sm">{o.l}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {/* Quick actions */}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setCallbackRequested(true); addIntent("callback_requested"); }}>
                  <Phone className="w-4 h-4 mr-2" />
                  Rappel ASAP
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => { setAsapRequested(true); addIntent("booking_clicked"); }}>
                  <Zap className="w-4 h-4 mr-2" />
                  RDV ASAP
                </Button>
              </div>

              {asapRequested && <Badge className="bg-warning text-warning-foreground">⚡ RDV ASAP demandé</Badge>}
              {callbackRequested && <Badge className="bg-primary text-primary-foreground">📞 Rappel demandé</Badge>}

              {/* Submit */}
              <Button onClick={handleSubmit} size="lg" className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Soumettre l'urgence
              </Button>

              {/* Safety */}
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 flex gap-3">
                <Shield className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="text-xs text-foreground">
                  <p className="font-semibold mb-1">Risque immédiat ?</p>
                  <p className="text-muted-foreground">En cas de danger (fuite de gaz, risque électrique, effondrement), appelez le <strong>911</strong> immédiatement.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* SUBMITTING */}
          {step === "submitting" && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-20 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Recherche en cours…</h2>
              <p className="text-sm text-muted-foreground">On trouve le meilleur entrepreneur pour votre urgence.</p>
            </motion.div>
          )}

          {/* DONE */}
          {step === "done" && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="pt-20 text-center">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Urgence soumise ✅</h2>
              <p className="text-sm text-muted-foreground mb-6">Vous serez contacté très rapidement.</p>
              <Button onClick={() => navigate("/dashboard")} variant="outline">
                Retour au tableau de bord
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
