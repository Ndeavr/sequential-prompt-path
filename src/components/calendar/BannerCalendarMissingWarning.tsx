/**
 * BannerCalendarMissingWarning — sticky warning if user hasn't connected.
 */
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useCalendarConnections } from "@/hooks/useCalendarConnection";

interface Props {
  role: string;
  message?: string;
}

export default function BannerCalendarMissingWarning({ role, message }: Props) {
  const { isConnected, loading } = useCalendarConnections();
  const [dismissed, setDismissed] = useState(false);

  if (loading || isConnected || dismissed) return null;

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-xs sm:text-sm text-amber-200">
          {message ?? "Connectez votre calendrier pour des rendez-vous sans conflit."}
        </p>
        <Link
          to={`/calendar/connect?role=${role}`}
          className="text-xs font-semibold text-amber-100 underline mt-1 inline-block"
        >
          Connecter maintenant →
        </Link>
      </div>
      <button onClick={() => setDismissed(true)} aria-label="Fermer" className="text-amber-300/60 hover:text-amber-200">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
