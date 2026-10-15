import { useEffect, useState } from "react";
import { ChevronDown, MessageSquare, Mic, Pause, Play, X } from "lucide-react";
import type { ClaraPageContext } from "@/services/clara/claraPageContext";
import { CLARA_FIELDS } from "@/services/clara/claraPageContext";

interface Props {
  caption: string; paused: boolean; context: ClaraPageContext | null;
  transcripts: { id: string; role: "user" | "alex"; text: string }[];
  onPause: () => void; onResume: () => void; onClose: () => void; onChat: () => void;
}
/** Presentation only: resizing never restarts or disconnects the voice transport. */
export default function ClaraVoiceDock({ caption, paused, context, transcripts, onPause, onResume, onClose, onChat }: Props) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [context?.path, context?.step]);
  const needsHelp = context && ["invalid", "hesitating"].includes(context.status) && context.focusedField;
  return <section className="clara-voice-dock" data-clara-dock data-expanded={expanded} aria-label="Clara — assistance sur la page">
    <div className="clara-voice-dock-header">
      <button type="button" className="clara-voice-dock-summary" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-label={expanded ? "Réduire Clara" : "Afficher la discussion avec Clara"}>
        <span className="clara-voice-dock-orb" aria-hidden><Mic size={18} /></span>
        <span><strong>Clara</strong><small>{caption}</small></span>
        {expanded ? <ChevronDown size={18} /> : <MessageSquare size={18} />}
      </button>
      <button type="button" onClick={paused ? onResume : onPause} aria-label={paused ? "Reprendre la voix" : "Mettre la voix en pause"}>{paused ? <Play size={18} /> : <Pause size={18} />}</button>
      <button type="button" onClick={onClose} aria-label="Fermer Clara"><X size={18} /></button>
    </div>
    {expanded && <div className="clara-voice-dock-details">
      {context?.step && <p className="clara-voice-dock-step">{context.step}</p>}
      {needsHelp && <p role="status">Besoin d’aide avec « {CLARA_FIELDS[context.focusedField!]} »? Demandez-moi.</p>}
      <div className="clara-voice-dock-messages" role="log" aria-label="Discussion en cours">
        {transcripts.slice(-4).map(entry => <p key={entry.id} data-role={entry.role}>{entry.text}</p>)}
      </div>
      <button type="button" onClick={onChat}>Continuer par écrit</button>
    </div>}
  </section>;
}
