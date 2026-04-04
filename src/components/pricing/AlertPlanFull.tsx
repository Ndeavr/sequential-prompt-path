/**
 * UNPRO — Alert Plan Full
 * Displayed when a plan slot is completely full in a cluster.
 */
import { ShieldAlert } from "lucide-react";

interface AlertPlanFullProps {
  planName: string;
  clusterName: string;
  waitlistActive?: boolean;
  onJoinWaitlist?: () => void;
}

export default function AlertPlanFull({ planName, clusterName, waitlistActive, onJoinWaitlist }: AlertPlanFullProps) {
  return (
    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg border border-red-500/20 bg-red-500/10">
          <ShieldAlert className="w-5 h-5 text-red-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-red-400">Plan {planName} complet</h4>
          <p className="text-xs text-muted-foreground mt-1">
            Toutes les places {planName} sont occupées dans le secteur <span className="font-medium text-foreground">{clusterName}</span>.
            {waitlistActive
              ? " Une liste d'attente est active."
              : " Aucune inscription possible pour le moment."}
          </p>
          {waitlistActive && onJoinWaitlist && (
            <button
              onClick={onJoinWaitlist}
              className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
            >
              Rejoindre la liste d'attente
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
