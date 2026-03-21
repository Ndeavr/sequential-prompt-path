/**
 * Setup Step 5: Portfolio photos
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Camera, Upload, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Props {
  contractorId?: string;
  onNext: () => void;
  onBack: () => void;
}

export default function SetupStepPhotos({ contractorId, onNext, onBack }: Props) {
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!contractorId) return;
    loadPhotos();
  }, [contractorId]);

  const loadPhotos = async () => {
    if (!contractorId) return;
    const { data } = await supabase
      .from("contractor_media")
      .select("*")
      .eq("contractor_id", contractorId)
      .order("display_order", { ascending: true });
    setPhotos(data ?? []);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !contractorId) return;

    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${contractorId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: storageErr } = await supabase.storage
        .from("contractor-media")
        .upload(path, file, { contentType: file.type });

      if (storageErr) {
        // Try with contractor-documents bucket as fallback
        toast.error(`Erreur upload ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("contractor-media").getPublicUrl(path);

      await supabase.from("contractor_media").insert({
        contractor_id: contractorId,
        media_type: "photo",
        url: urlData?.publicUrl || path,
        storage_path: path,
        display_order: photos.length,
        is_approved: true,
      });
    }

    toast.success("Photo(s) ajoutée(s) !");
    await loadPhotos();
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (photo: any) => {
    if (photo.storage_path) {
      await supabase.storage.from("contractor-media").remove([photo.storage_path]);
    }
    await supabase.from("contractor_media").delete().eq("id", photo.id);
    toast.success("Photo supprimée");
    await loadPhotos();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
          <Camera className="h-7 w-7 text-success" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">Photos & portfolio</h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Montrez vos réalisations. Les entrepreneurs avec photos reçoivent 3× plus de rendez-vous.
        </p>
      </div>

      <div className="rounded-3xl border border-border/50 bg-card/60 backdrop-blur p-6 space-y-4">
        <label className="cursor-pointer block">
          <input
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleUpload}
            disabled={uploading}
          />
          <div className="border-2 border-dashed border-border/50 rounded-2xl p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition-all">
            <Upload className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground">
              {uploading ? "Téléversement en cours…" : "Glissez ou cliquez pour ajouter des photos"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WebP • Max 10 MB chaque</p>
          </div>
        </label>

        {photos.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {photos.map(photo => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-square bg-muted/20">
                <img
                  src={photo.url}
                  alt="Portfolio"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <button
                  onClick={() => handleDelete(photo)}
                  className="absolute top-2 right-2 p-1 rounded-full bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length === 0 && (
          <p className="text-center text-sm text-muted-foreground/60 py-4">
            Aucune photo. Cette étape est optionnelle mais fortement recommandée.
          </p>
        )}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" /> Retour</Button>
        <Button onClick={onNext} className="rounded-2xl px-6 gap-2 shadow-[var(--shadow-glow)]">
          {photos.length > 0 ? "Continuer" : "Passer cette étape"}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
