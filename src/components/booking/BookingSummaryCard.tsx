import { Calendar, Clock, MapPin, User, Phone, Mail, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AppointmentType, SlotCandidate } from "@/services/bookingSlotEngine";

interface BookingSummaryCardProps {
  appointmentType: AppointmentType;
  selectedSlot: SlotCandidate;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  address?: string;
  notes?: string;
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting?: boolean;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function BookingSummaryCard({
  appointmentType,
  selectedSlot,
  clientName,
  clientPhone,
  clientEmail,
  address,
  notes,
  onConfirm,
  onBack,
  isSubmitting,
}: BookingSummaryCardProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
      {/* Header */}
      <div className="p-5 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-body font-semibold text-foreground">Récapitulatif du rendez-vous</h3>
            <p className="text-meta text-muted-foreground">Vérifiez les détails avant de confirmer</p>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 space-y-4">
        {/* Appointment type */}
        <div className="flex items-start gap-3">
          <div className="w-3 h-3 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: appointmentType.color }} />
          <div>
            <p className="text-body font-medium text-foreground">{appointmentType.title}</p>
            <p className="text-meta text-muted-foreground">{appointmentType.short_description}</p>
          </div>
        </div>

        <div className="h-px bg-border/40" />

        {/* Date & time */}
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-body text-foreground capitalize">{formatDate(selectedSlot.start)}</p>
            <p className="text-meta text-muted-foreground">
              {formatTime(selectedSlot.start)} – {formatTime(selectedSlot.end)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-body text-muted-foreground">{appointmentType.duration_minutes} minutes</p>
        </div>

        {/* Client info */}
        <div className="h-px bg-border/40" />

        <div className="flex items-center gap-3">
          <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <p className="text-body text-foreground">{clientName}</p>
        </div>

        {clientPhone && (
          <div className="flex items-center gap-3">
            <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-body text-muted-foreground">{clientPhone}</p>
          </div>
        )}

        {clientEmail && (
          <div className="flex items-center gap-3">
            <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-body text-muted-foreground">{clientEmail}</p>
          </div>
        )}

        {address && (
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-body text-muted-foreground">{address}</p>
          </div>
        )}

        {notes && (
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-meta text-muted-foreground">{notes}</p>
          </div>
        )}

        {/* Price */}
        {!appointmentType.is_free && (
          <>
            <div className="h-px bg-border/40" />
            <div className="flex items-center justify-between">
              <span className="text-body text-muted-foreground">Montant</span>
              <span className="text-body font-semibold text-foreground">
                {appointmentType.price_type === "starting_from" ? "À partir de " : ""}
                {(appointmentType.price_amount / 100).toFixed(0)}$
              </span>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="p-5 border-t border-border/40 flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isSubmitting}>
          Modifier
        </Button>
        <Button onClick={onConfirm} className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? "Confirmation..." : "Confirmer le rendez-vous"}
        </Button>
      </div>
    </div>
  );
}
