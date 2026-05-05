/**
 * UploadZone — Action card injected by Alex when she asks for a photo.
 */
import { useRef } from "react";
import { Camera, ImageIcon } from "lucide-react";
import { useAlexUIBridge } from "@/features/alex/hooks/useAlexUIBridge";
import { useAlexVisualStore } from "./visualStore";

interface Props {
  actionId: string;
  title?: string;
  subtitle?: string;
  userMessageContext?: string;
}

export default function UploadZone({
  actionId,
  title = "Ajouter une photo",
  subtitle = "Prenez une photo ou choisissez une image",
  userMessageContext,
}: Props) {
  const { onFileUpload } = useAlexUIBridge();
  const removeAction = useAlexVisualStore((s) => s.removeAction);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    removeAction(actionId);
    await onFileUpload(file, userMessageContext);
    e.target.value = "";
  };

  return (
    <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => cameraRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium active:scale-95 transition"
        >
          <Camera className="w-4 h-4" /> Prendre
        </button>
        <button
          onClick={() => galleryRef.current?.click()}
          className="flex items-center justify-center gap-2 rounded-xl bg-card border border-border py-2.5 text-sm font-medium active:scale-95 transition"
        >
          <ImageIcon className="w-4 h-4" /> Choisir
        </button>
      </div>
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handle} />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handle} />
    </div>
  );
}
