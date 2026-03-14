/**
 * UNPRO — Contractor Contribution Form
 * Submitted via QR scan. Owner must approve before it enriches the passport.
 */

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { submitContribution, uploadContributionFile } from "@/services/qr";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wrench, Camera, Upload, Check, ArrowRight, Loader2,
  ShieldCheck, AlertCircle, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const WORK_TYPES = [
  "Plomberie", "Électricité", "Toiture", "Isolation",
  "Chauffage / Climatisation", "Menuiserie", "Peinture",
  "Fondation", "Fenêtres / Portes", "Rénovation générale", "Autre",
];

interface ContributionFormProps {
  propertyId: string;
  qrCodeId: string;
  userId: string;
}

export default function ContributionForm({ propertyId, qrCodeId, userId }: ContributionFormProps) {
  const [step, setStep] = useState<"form" | "submitting" | "done">("form");
  const fileRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [contractorProfile, setContractorProfile] = useState<any>(null);

  const [form, setForm] = useState({
    work_type: "",
    work_description: "",
    work_date: "",
    cost_estimate: "",
    contributor_name: "",
    contributor_phone: "",
  });

  // Check if user is a registered contractor
  useState(() => {
    (async () => {
      const { data } = await supabase
        .from("contractors")
        .select("id, business_name")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setContractorProfile(data);
    })();
  });

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setPhotos((prev) => [...prev, ...files].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!form.work_type) {
      toast.error("Sélectionnez un type de travaux.");
      return;
    }

    setStep("submitting");

    try {
      // Upload photos
      const photoPaths: string[] = [];
      for (const photo of photos) {
        const path = await uploadContributionFile(propertyId, photo, "photos");
        photoPaths.push(path);
      }

      await submitContribution({
        property_id: propertyId,
        qr_code_id: qrCodeId,
        contractor_id: contractorProfile?.id ?? undefined,
        contributor_name: contractorProfile?.business_name ?? form.contributor_name || undefined,
        contributor_phone: form.contributor_phone || undefined,
        work_type: form.work_type,
        work_description: form.work_description || undefined,
        work_date: form.work_date || undefined,
        cost_estimate: form.cost_estimate ? parseFloat(form.cost_estimate) : undefined,
        photo_paths: photoPaths,
      });

      setStep("done");
      toast.success("Contribution soumise !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la soumission.");
      setStep("form");
    }
  };

  return (
    <div className="min-h-screen premium-bg">
      <div className="max-w-md mx-auto px-5 py-8">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div key="form" exit={{ opacity: 0 }}>
              <div className="text-center space-y-3 mb-6">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Wrench className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-lg font-bold text-foreground">
                  Soumettre une contribution
                </h1>
                <p className="text-sm text-muted-foreground">
                  Documentez les travaux réalisés. Le propriétaire devra approuver avant publication.
                </p>
              </div>

              <Card className="glass-card border-0">
                <CardContent className="p-5 space-y-4">
                  {/* Contractor identity */}
                  {contractorProfile ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-success/5 border border-success/10">
                      <ShieldCheck className="h-4 w-4 text-success" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{contractorProfile.business_name}</p>
                        <p className="text-[10px] text-muted-foreground">Entrepreneur vérifié UNPRO</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Votre nom / entreprise</Label>
                        <Input
                          value={form.contributor_name}
                          onChange={(e) => setForm((f) => ({ ...f, contributor_name: e.target.value }))}
                          placeholder="Ex: Plomberie ABC"
                          className="rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Téléphone (optionnel)</Label>
                        <Input
                          value={form.contributor_phone}
                          onChange={(e) => setForm((f) => ({ ...f, contributor_phone: e.target.value }))}
                          placeholder="514-555-1234"
                          className="rounded-xl"
                        />
                      </div>
                    </div>
                  )}

                  {/* Work type */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Type de travaux *</Label>
                    <Select value={form.work_type} onValueChange={(v) => setForm((f) => ({ ...f, work_type: v }))}>
                      <SelectTrigger className="rounded-xl"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                      <SelectContent>
                        {WORK_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Description des travaux</Label>
                    <Textarea
                      value={form.work_description}
                      onChange={(e) => setForm((f) => ({ ...f, work_description: e.target.value }))}
                      placeholder="Décrivez les travaux réalisés…"
                      rows={3}
                      className="rounded-xl"
                    />
                  </div>

                  {/* Date + Cost */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Date des travaux</Label>
                      <Input
                        type="date"
                        value={form.work_date}
                        onChange={(e) => setForm((f) => ({ ...f, work_date: e.target.value }))}
                        className="rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Coût estimé ($)</Label>
                      <Input
                        type="number"
                        value={form.cost_estimate}
                        onChange={(e) => setForm((f) => ({ ...f, cost_estimate: e.target.value }))}
                        placeholder="0"
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="space-y-2">
                    <Label className="text-xs">Photos (max 5)</Label>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handlePhotoAdd}
                    />
                    <div className="flex gap-2 flex-wrap">
                      {photos.map((p, i) => (
                        <div key={i} className="h-16 w-16 rounded-lg overflow-hidden bg-muted">
                          <img src={URL.createObjectURL(p)} alt="" className="h-full w-full object-cover" />
                        </div>
                      ))}
                      {photos.length < 5 && (
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className="h-16 w-16 rounded-lg border-2 border-dashed border-border/60 flex items-center justify-center text-muted-foreground hover:border-primary/40 transition-colors"
                        >
                          <Camera className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Privacy */}
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-muted/30">
                    <AlertCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Cette contribution sera soumise au propriétaire pour approbation.
                      Aucune donnée ne sera publiée sans son consentement.
                    </p>
                  </div>

                  <Button onClick={handleSubmit} className="w-full rounded-xl h-11">
                    Soumettre la contribution
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "submitting" && (
            <motion.div key="submitting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Envoi en cours…</p>
              </div>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="glass-card border-0">
                <CardContent className="p-6 text-center space-y-5">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"
                  >
                    <Check className="h-8 w-8 text-success" />
                  </motion.div>
                  <h2 className="text-lg font-bold text-foreground">Contribution envoyée</h2>
                  <p className="text-sm text-muted-foreground">
                    Le propriétaire recevra une notification pour approuver votre contribution.
                  </p>
                  <Button asChild variant="outline" className="w-full rounded-xl gap-2">
                    <Link to="/pro">
                      Retour au tableau de bord <ArrowRight className="h-3 w-3" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
