/** Owner-confirmed public logo and portfolio, shared by setup and profile editor. */
import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface Props { contractorId?: string; onNext?: () => void; onBack?: () => void; embedded?: boolean }
export default function SetupStepPhotos({ contractorId, onNext, onBack, embedded = false }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [photos, setPhotos] = useState<Tables<"contractor_media">[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!contractorId || !user) return;
    const [owner, media] = await Promise.all([
      supabase.from("contractors").select("id,logo_url").eq("id", contractorId).eq("user_id", user.id).single(),
      supabase.from("contractor_media").select("*").eq("contractor_id", contractorId).eq("media_type", "photo").order("display_order"),
    ]);
    if (owner.error || media.error) throw new Error("Impossible de charger vos images. Réessayez.");
    setLogo(owner.data.logo_url);
    setPhotos(media.data ?? []);
  }, [contractorId, user]);
  useEffect(() => { void load().catch(e => setError(e.message)); }, [load]);
  const refresh = async () => {
    await load();
    await Promise.all(["contractor-profile", "contractor-full-public"].map(key => qc.invalidateQueries({ queryKey: [key] })));
  };
  const upload = async (event: React.ChangeEvent<HTMLInputElement>, kind: "logo" | "photo") => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || !contractorId || !user || busy) return;
    setBusy(true); setError("");
    let added = 0;
    try {
      const owner = await supabase.from("contractors").select("id").eq("id", contractorId).eq("user_id", user.id).single();
      if (owner.error || !owner.data) throw new Error("Votre profil n’est pas accessible.");
      for (const file of files) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
          throw new Error("Choisissez une image JPG, PNG ou WebP de moins de 10 Mo.");
        }
        const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
        const storagePath = `${user.id}/${contractorId}/${crypto.randomUUID()}.${ext}`;
        const bucket = supabase.storage.from("contractor-media");
        const stored = await bucket.upload(storagePath, file, { contentType: file.type });
        if (stored.error) throw new Error("Le téléversement a échoué. Réessayez.");
        const publicUrl = bucket.getPublicUrl(storagePath).data.publicUrl;
        const saved = kind === "logo"
          ? await supabase.from("contractors").update({ logo_url: publicUrl }).eq("id", contractorId).eq("user_id", user.id).select("id").single()
          : await supabase.from("contractor_media").insert({ contractor_id: contractorId, media_type: "photo", public_url: publicUrl, storage_path: storagePath, display_order: Math.max(-1, ...photos.map(p => p.display_order ?? 0)) + 1 + added, is_approved: true, data_source: "owner_upload" }).select("id").single();
        if (saved.error || !saved.data) {
          await bucket.remove([storagePath]);
          throw new Error("L’image n’a pas pu être enregistrée. Réessayez.");
        }
        added++;
      }
      toast.success(kind === "logo" ? "Logo enregistré" : "Photos enregistrées");
    } catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { if (added) await refresh().catch(e => setError(e.message)); setBusy(false); }
  };
  const remove = async (photo: Tables<"contractor_media">) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await supabase.from("contractor_media").delete().eq("id", photo.id).eq("contractor_id", contractorId!).select("id").single();
      if (result.error || !result.data) throw new Error("La photo n’a pas pu être retirée.");
      // Unlink first; never leave a published record pointing to a deleted object.
      if (photo.storage_path?.startsWith(`${user?.id}/`)) await supabase.storage.from("contractor-media").remove([photo.storage_path]);
      await refresh(); toast.success("Photo retirée de votre fiche");
    } catch (e) { setError(e instanceof Error ? e.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-4" aria-label="Logo et réalisations">
    <div><h2 className="text-xl font-bold">Votre logo et vos réalisations</h2><p className="text-sm text-muted-foreground">Ces images seront visibles sur votre fiche publique. Ajoutez uniquement vos propres réalisations.</p></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!contractorId ? <p className="text-sm text-muted-foreground">Enregistrez votre profil pour ajouter vos images.</p> : <>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border p-4">
        {logo && <img src={logo} alt="Votre logo" className="h-20 w-28 rounded-lg bg-white p-2 object-contain" />}
        <label className="cursor-pointer rounded-lg border p-3 text-sm"><Upload className="mr-2 inline h-4 w-4" />{logo ? "Remplacer le logo" : "Ajouter votre logo"}<input aria-label="Ajouter votre logo" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={e => void upload(e, "logo")} /></label>
      </div>
      <label className="block cursor-pointer rounded-xl border-2 border-dashed p-6 text-center"><Upload className="mx-auto mb-2 h-6 w-6" />{busy ? "Enregistrement en cours…" : "Ajouter des photos de vos réalisations"}<span className="mt-1 block text-xs text-muted-foreground">JPG, PNG, WebP · Maximum 10 Mo par image</span><input aria-label="Ajouter des photos de vos réalisations" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy} onChange={e => void upload(e, "photo")} /></label>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{photos.map((photo, index) => <div key={photo.id} className="relative aspect-square overflow-hidden rounded-xl bg-muted"><img src={photo.public_url} alt={`Votre réalisation ${index + 1}`} className="h-full w-full object-cover" loading="lazy" /><button type="button" aria-label={`Retirer la photo ${index + 1}`} disabled={busy} onClick={() => void remove(photo)} className="absolute right-2 top-2 rounded-full bg-background/90 p-2"><X className="h-4 w-4" /></button></div>)}</div>
      {!photos.length && <p className="text-sm text-muted-foreground">Vos réalisations apparaîtront ici et sur votre fiche.</p>}
    </>}
    {!embedded && <div className="flex justify-between"><Button type="button" variant="ghost" onClick={onBack} disabled={busy}><ArrowLeft className="mr-2 h-4 w-4" />Retour</Button><Button type="button" onClick={onNext} disabled={busy}>{photos.length ? "Continuer" : "Passer cette étape"}<ArrowRight className="ml-2 h-4 w-4" /></Button></div>}
  </section>;
}
