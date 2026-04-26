/**
 * ProfileSavePrompt — Inline guest CTA card. Shown ONCE after first value summary.
 */
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { PROFILE_PROMPT_FR } from "@/services/alexCopilotEngine";

interface Props {
  onContinueGuest: () => void;
}

export default function ProfileSavePrompt({ onContinueGuest }: Props) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl bg-gradient-to-br from-sky-500/15 to-blue-600/10 border border-sky-400/30 p-4 space-y-3">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-sky-400/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-sky-300" />
        </div>
        <p className="text-[13px] leading-relaxed text-white/90">{PROFILE_PROMPT_FR}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate("/auth?context=alex_save")}
          className="px-4 py-2 rounded-full text-[13px] font-semibold bg-gradient-to-r from-sky-500 to-blue-500 text-white shadow active:scale-95 transition"
        >
          Créer mon profil
        </button>
        <button
          onClick={onContinueGuest}
          className="px-4 py-2 rounded-full text-[13px] font-medium bg-white/8 border border-white/15 text-white/85 hover:bg-white/12 active:scale-95 transition"
        >
          Continuer sans profil
        </button>
      </div>
    </div>
  );
}
