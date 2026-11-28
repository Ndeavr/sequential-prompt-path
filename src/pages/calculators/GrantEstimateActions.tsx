import { useRef, useState } from "react";
import { Bookmark, Share2 } from "lucide-react";
import { toast } from "sonner";
import PhoneOtpForm from "@/components/auth/PhoneOtpForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/stores/authSessionStore";
import { GRANT_ESTIMATE_KEY, grantEstimateSchema } from "@/lib/grantEstimateSnapshot";
import type { GrantInputs } from "@/lib/grantCalculator2026";

export default function GrantEstimateActions({ inputs, onRestore, url }: {
  inputs: GrantInputs;
  onRestore: (inputs: GrantInputs) => void;
  url: string;
}) {
  const { session, loading } = useAuthSession();
  const [saveOpen, setSaveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const saved = grantEstimateSchema.safeParse(session?.user.user_metadata[GRANT_ESTIMATE_KEY]);

  async function save() {
    if (!session || inFlight.current) return;
    const snapshot = grantEstimateSchema.safeParse(inputs);
    if (!snapshot.success) {
      toast.error("Vérifiez vos réponses avant de sauvegarder.");
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { [GRANT_ESTIMATE_KEY]: snapshot.data } });
      if (error) throw error;
      setSaveOpen(false);
      toast.success("Estimation sauvegardée dans votre compte.");
    } catch {
      toast.error("Impossible de sauvegarder votre estimation. Réessayez.");
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "Calculateur Rénoclimat · UNPRO", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié.");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareOpen(true);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={loading || saving || !inputs.selected.length}
        onClick={() => session ? void save() : setSaveOpen(true)}>
        <Bookmark aria-hidden="true" /> Sauvegarder
      </Button>
      <Button type="button" variant="outline" onClick={() => void share()}>
        <Share2 aria-hidden="true" /> Partager la page
      </Button>
      {saved.success && <Button type="button" variant="ghost" onClick={() => {
        onRestore(saved.data);
        toast.success("Estimation sauvegardée chargée.");
      }}>Reprendre mon estimation</Button>}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{session ? "Sauvegarder mon estimation" : "Ouvrir une session UNPRO"}</DialogTitle>
            <DialogDescription>Retrouvez votre dernière estimation en revenant sur cette page connecté à votre compte.</DialogDescription>
          </DialogHeader>
          {session
            ? <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Sauvegarde…" : "Sauvegarder mon estimation"}</Button>
            : <PhoneOtpForm />}
        </DialogContent>
      </Dialog>
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Partager le calculateur</DialogTitle>
            <DialogDescription>Copiez ce lien pour partager la page sans vos réponses.</DialogDescription>
          </DialogHeader>
          <input aria-label="Lien du calculateur" className="w-full rounded-md border bg-background p-2"
            readOnly value={url} onFocus={event => event.currentTarget.select()} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
