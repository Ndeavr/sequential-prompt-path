import { BarChart3, MessageCircle, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  onTrackCta: (key: string, section: string) => void;
}

export default function StickyMobileCTAEntrepreneur({ onTrackCta }: Props) {
  const navigate = useNavigate();

  const actions = [
    { icon: BarChart3, label: "Score", onClick: () => { onTrackCta("sticky_score", "sticky"); navigate("/entrepreneur/score"); } },
    { icon: MessageCircle, label: "Alex", onClick: () => { onTrackCta("sticky_alex", "sticky"); navigate("/alex"); } },
    { icon: MapPin, label: "Ville", onClick: () => { onTrackCta("sticky_city", "sticky"); document.getElementById("section-territories")?.scrollIntoView({ behavior: "smooth" }); } },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="bg-card/95 backdrop-blur-lg border-t border-border/50 px-4 py-2.5 flex justify-around items-center gap-2">
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.onClick}
            className="flex flex-col items-center gap-0.5 text-muted-foreground hover:text-primary transition-colors min-w-[64px]"
          >
            <a.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
