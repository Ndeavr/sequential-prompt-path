/**
 * UNPRO — Electrical Panel QR Flow
 * Owner scans QR → uploads photo → attaches to passport → creates event.
 */

import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Check, Zap, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ElectricalPanelFlowProps {
  propertyId: string;
  qrId: string;
}

export default function ElectricalPanelFlow({ propertyId, qrId }: ElectricalPanelFlowProps) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"prompt" | "uploading" | "done">("prompt");
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Preview
    setPreview(URL.createObjectURL(file));
    setStep("uploading");

    try {
      // 1. Upload to private storage
      const path = `${user.id}/${propertyId}/electrical-panel/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("property-photos")
        .upload(path, file);
      if (uploadError) throw uploadError;

      // 2. Create property document record
      await supabase.from("property_documents").insert({
        property_id: propertyId,
        user_id: user.id,
        title: "Photo du panneau électrique",
        document_type: "electrical_panel_photo",
        storage_path: path,
        file_size: file.size,
      });

      // 3. Create property event
      await supabase.from("property_events").insert({
        property_id: propertyId,
        user_id: user.id,
        event_type: "photo_upload",
        title: "Photo du panneau électrique ajoutée",
        description: "Photo capturée via QR code du panneau électrique.",
        metadata: { qr_id: qrId, storage_path: path, source: "qr_scan" },
      });

      // 4. Complete matching task if exists
      await supabase
        .from("property_completion_tasks")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("property_id", propertyId)
        .eq("task_key", "upload_panel_photo")
        .eq("status", "pending");

      setStep("done");
      toast.success("Photo ajoutée au Passeport Maison !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du téléversement.");
      setStep("prompt");
    }
  };

  return (
    <div className="min-h-screen premium-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <AnimatePresence mode="wait">
          {step === "prompt" && (
            <motion.div key="prompt" exit={{ opacity: 0, y: -10 }}>
              <Card className="glass-card border-0">
                <CardContent className="p-6 space-y-5">
                  <div className="text-center space-y-3">
                    <div className="h-16 w-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto">
                      <Zap className="h-8 w-8 text-warning" />
                    </div>
                    <Badge variant="outline" className="text-xs border-warning/20 text-warning">
                      Panneau électrique
                    </Badge>
                    <h2 className="text-lg font-bold text-foreground">
                      Ajouter une photo du panneau
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Prenez une photo claire de votre panneau électrique.
                      Elle sera ajoutée en privé à votre Passeport Maison.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      onClick={() => fileRef.current?.click()}
                      className="w-full rounded-xl gap-2 h-12"
                    >
                      <Camera className="h-5 w-5" /> Prendre une photo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (fileRef.current) {
                          fileRef.current.removeAttribute("capture");
                          fileRef.current.click();
                        }
                      }}
                      className="w-full rounded-xl gap-2"
                    >
                      <Upload className="h-4 w-4" /> Choisir depuis la galerie
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
                    <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                    <p className="text-[10px] text-muted-foreground">
                      Votre photo est stockée en privé. Seul vous y avez accès.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "uploading" && (
            <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="glass-card border-0">
                <CardContent className="p-6 space-y-5 text-center">
                  {preview && (
                    <img
                      src={preview}
                      alt="Panneau"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                  )}
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Téléversement en cours…</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="glass-card border-0">
                <CardContent className="p-6 space-y-5 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto"
                  >
                    <Check className="h-8 w-8 text-success" />
                  </motion.div>
                  <h2 className="text-lg font-bold text-foreground">Photo ajoutée !</h2>
                  <p className="text-sm text-muted-foreground">
                    Votre panneau électrique a été documenté dans votre Passeport Maison.
                  </p>

                  {preview && (
                    <img
                      src={preview}
                      alt="Panneau"
                      className="w-full h-32 object-cover rounded-xl opacity-60"
                    />
                  )}

                  <Button asChild className="w-full rounded-xl gap-2">
                    <Link to={`/dashboard/properties/${propertyId}/passport`}>
                      Voir le Passeport <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
