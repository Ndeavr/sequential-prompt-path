/**
 * ChatPhotoThumb — Inline thumbnail of a photo uploaded through Alex chat.
 */
import { Image as ImageIcon } from "lucide-react";

interface Props {
  url: string;
  name?: string;
}

export default function ChatPhotoThumb({ url, name }: Props) {
  return (
    <div className="inline-flex items-center gap-2 max-w-full rounded-2xl overflow-hidden bg-white/8 border border-white/15 p-1.5">
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/40 flex items-center justify-center flex-shrink-0">
        {url ? (
          <img src={url} alt={name || "Photo"} className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-5 h-5 text-white/50" />
        )}
      </div>
      <div className="pr-2 min-w-0">
        <p className="text-[12px] font-medium text-white truncate">{name || "Photo"}</p>
        <p className="text-[10px] text-white/50">Reçue par Alex</p>
      </div>
    </div>
  );
}
