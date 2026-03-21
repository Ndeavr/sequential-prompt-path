import { CheckCircle2, Calendar, Clock, MapPin, Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface BookingConfirmationCardProps {
  companyName: string;
  appointmentTitle: string;
  date: string;
  time: string;
  address?: string;
  phone?: string;
  bookingId: string;
  onDone?: () => void;
}

export function BookingConfirmationCard({
  companyName,
  appointmentTitle,
  date,
  time,
  address,
  phone,
  bookingId,
  onDone,
}: BookingConfirmationCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border border-success/20 bg-gradient-to-b from-success/5 to-card overflow-hidden"
    >
      {/* Success header */}
      <div className="p-6 text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4"
        >
          <CheckCircle2 className="w-8 h-8 text-success" />
        </motion.div>

        <h2 className="text-section text-foreground">Rendez-vous confirmé!</h2>
        <p className="text-body text-muted-foreground mt-1">
          Votre rendez-vous avec {companyName} est confirmé
        </p>
      </div>

      {/* Details */}
      <div className="px-6 pb-4 space-y-3">
        <div className="rounded-xl bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-primary flex-shrink-0" />
            <span className="text-body font-medium text-foreground">{appointmentTitle}</span>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-body text-foreground capitalize">{date}</span>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-body text-foreground">{time}</span>
          </div>

          {address && (
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-meta text-muted-foreground">{address}</span>
            </div>
          )}

          {phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-meta text-muted-foreground">{phone}</span>
            </div>
          )}
        </div>

        <p className="text-caption text-muted-foreground text-center">
          Référence: {bookingId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* CTA */}
      <div className="p-6 border-t border-border/40">
        <Button onClick={onDone} className="w-full gap-2">
          Terminé
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
