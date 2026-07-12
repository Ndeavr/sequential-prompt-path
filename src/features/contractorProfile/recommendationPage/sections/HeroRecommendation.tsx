/**
 * HeroRecommendation — Logo + name + trust badges. No giant avatar, no generic house photo.
 */
import { Star, ShieldCheck, Phone, Mail, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { availabilityLabel } from "../logic/aiReferenceBuilder";

interface Props {
  contractor: any;
}

export default function HeroRecommendation({ contractor: c }: Props) {
  const initials = (c.business_name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  const yearJoined = c.created_at ? new Date(c.created_at).getFullYear() : null;
  const rating = c.rating ?? null;
  const areas: string[] = c.service_areas ?? [];

  return (
    <header className="space-y-4">
      <div className="flex items-start gap-4">
        {c.logo_url ? (
          <img
            src={c.logo_url}
            alt={`Logo ${c.business_name}`}
            className="w-16 h-16 rounded-2xl object-cover border border-border shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground leading-tight">
            {c.business_name}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {rating !== null && (
              <div className="flex items-center gap-1 text-sm text-foreground">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "text-amber-500 fill-amber-500" : "text-muted"}`}
                  />
                ))}
                <span className="ml-1 text-muted-foreground">
                  {rating.toFixed(1)} · {c.review_count ?? 0} avis
                </span>
              </div>
            )}
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="w-3 h-3" /> Entreprise vérifiée UNPRO
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        {c.specialty && (
          <InfoTile label="Catégorie" value={c.specialty} />
        )}
        {areas.length > 0 && (
          <InfoTile label="Zones" value={areas.slice(0, 3).join(" · ")} />
        )}
        <InfoTile label="Rayon" value={`${c.travel_radius_km ?? 15} km`} />
        <InfoTile
          label="Disponibilité"
          value={availabilityLabel(c.availability_estimate ?? "cette_semaine")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <TrustBadge label="Identité vérifiée" active />
        <TrustBadge label="Coordonnées validées" active={!!c.phone && !!c.email} />
        <TrustBadge label="Assuré" active={!!c.insurance_info} />
        <TrustBadge label="Entreprise active" active={c.is_published} />
      </div>

      {yearJoined && (
        <p className="text-xs text-muted-foreground">Membre UNPRO depuis {yearJoined}</p>
      )}
    </header>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card border border-border px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-foreground truncate text-sm">{value}</div>
    </div>
  );
}

function TrustBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border ${
        active
          ? "bg-primary/10 border-primary/30 text-primary"
          : "bg-muted/40 border-border text-muted-foreground"
      }`}
    >
      {active ? "✓" : "○"} {label}
    </span>
  );
}
