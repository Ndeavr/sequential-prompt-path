/**
 * PhotoUploadInviteCard — Inline chat card inviting the homeowner to add photos.
 */
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onUpload?: () => void;
  onSkip?: () => void;
}

export default function PhotoUploadInviteCard({ onUpload, onSkip }: Props) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/15 p-2.5">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-readable">Une photo vaut mille mots</h3>
          <p className="text-sm text-readable-secondary mt-1">
            Ajoutez des photos pour affiner le diagnostic et améliorer la précision du matching.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onUpload} size="sm" className="gap-2">
          <Camera className="w-4 h-4" />
          Ajouter des photos
        </Button>
        <Button onClick={onSkip} size="sm" variant="ghost">
          Plus tard
        </Button>
      </div>
    </div>
  );
}
