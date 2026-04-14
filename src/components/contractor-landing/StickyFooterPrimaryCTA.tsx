import { Mic, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onVoice: () => void;
  onChat: () => void;
}

export default function StickyFooterPrimaryCTA({ onVoice, onChat }: Props) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur border-t p-3 safe-area-bottom">
      <div className="max-w-lg mx-auto flex gap-2">
        <Button
          onClick={onVoice}
          className="flex-1 h-12 text-sm font-semibold rounded-xl gap-2"
        >
          <Mic className="w-4 h-4" />
          Parler à Alex
        </Button>
        <Button
          variant="outline"
          onClick={onChat}
          className="h-12 px-4 rounded-xl"
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
