/**
 * Branded Signature footer for booking pages, confirmations, and QR cards.
 * Shows contractor branding + UNPRO Signature badge.
 */
import { Shield, ExternalLink } from "lucide-react";

interface SignatureFooterProps {
  companyName: string;
  phone?: string;
  email?: string;
  city?: string;
  bookingUrl?: string;
  variant?: "page" | "confirmation" | "compact";
}

export function SignatureFooter({
  companyName,
  phone,
  email,
  city,
  bookingUrl,
  variant = "page",
}: SignatureFooterProps) {
  if (variant === "compact") {
    return (
      <div className="flex items-center justify-center gap-2 py-3 text-caption text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Réservation Signature par</span>
        <span className="font-semibold text-foreground">UNPRO</span>
      </div>
    );
  }

  return (
    <footer className="mt-8 border-t border-border/40 pt-6 pb-8">
      <div className="max-w-lg mx-auto px-4 space-y-4">
        {/* Contractor info */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-body font-semibold text-foreground">{companyName}</p>
            {city && <p className="text-meta text-muted-foreground">{city}</p>}
            <div className="flex flex-col gap-0.5">
              {phone && (
                <a href={`tel:${phone}`} className="text-meta text-primary hover:underline">
                  {phone}
                </a>
              )}
              {email && (
                <a href={`mailto:${email}`} className="text-meta text-primary hover:underline">
                  {email}
                </a>
              )}
            </div>
          </div>

          {bookingUrl && (
            <a
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-meta text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Lien de réservation
            </a>
          )}
        </div>

        {/* Signature badge */}
        <div className="flex items-center justify-center gap-2 pt-4 border-t border-border/20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-caption font-semibold text-primary">Réservation Signature</span>
          </div>
          <span className="text-caption text-muted-foreground">par</span>
          <span className="text-caption font-bold text-foreground tracking-tight">UNPRO</span>
        </div>

        {variant === "page" && (
          <p className="text-center text-caption text-muted-foreground/60 leading-relaxed">
            Votre agenda ne devrait pas juste accepter des rendez-vous. Il devrait choisir les meilleurs.
          </p>
        )}
      </div>
    </footer>
  );
}
