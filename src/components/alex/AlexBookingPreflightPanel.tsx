/**
 * AlexBookingPreflightPanel — Summary before opening calendar.
 * Semi-visible, confirms what Alex prepared in background.
 */
import { motion } from "framer-motion";
import { MapPin, Wrench, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingDraft } from "@/services/alexInvisibleBooking";

interface Props {
  draft: BookingDraft;
  matchName?: string;
  onConfirm: () => void;
  onEdit: () => void;
  className?: string;
}

export default function AlexBookingPreflightPanel({ draft, matchName, onConfirm, onEdit, className = "" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-card border border-border rounded-2xl p-4 ${className}`}
    >
      <p className="text-sm font-semibold text-foreground mb-3">Je vous ai préparé ça 👇</p>

      <div className="space-y-2 mb-4">
        {draft.serviceType && (
          <InfoRow icon={<Wrench className="w-3.5 h-3.5" />} label="Service" value={draft.serviceType} />
        )}
        {draft.city && (
          <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Secteur" value={draft.city} />
        )}
        {matchName && (
          <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Pro recommandé" value={matchName} />
        )}
        <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Créneaux" value="Cette semaine" />
      </div>

      <div className="flex gap-2">
        <Button onClick={onConfirm} className="flex-1" size="sm">
          Voir les dispos
        </Button>
        <Button onClick={onEdit} variant="outline" size="sm">
          Modifier
        </Button>
      </div>
    </motion.div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
