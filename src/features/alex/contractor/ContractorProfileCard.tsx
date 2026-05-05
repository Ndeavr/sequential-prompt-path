/**
 * ContractorProfileCard — Imported profile snapshot. Unknown → "À vérifier".
 */
import { Star, MapPin, Wrench, Hash } from "lucide-react";
import { useContractorStore } from "./contractorStore";

const TBV = <span className="text-amber-500/80 italic">À vérifier</span>;

export default function ContractorProfileCard() {
  const p = useContractorStore((s) => s.profile);
  if (!p) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/80 backdrop-blur p-4 space-y-3">
      <div className="flex items-center gap-3">
        {p.logo_url ? (
          <img src={p.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-semibold">
            {p.business_name?.[0] || "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{p.business_name || "Entreprise"}</p>
          <p className="text-xs text-muted-foreground truncate">{p.phone || TBV}</p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-foreground">
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
            {p.google_rating ?? "—"}
          </div>
          <p className="text-[10px] text-muted-foreground">{p.google_reviews_count ?? 0} avis</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <Row icon={<Hash className="w-3 h-3" />} label="RBQ" value={p.rbq || TBV} />
        <Row icon={<Wrench className="w-3 h-3" />} label="Services" value={p.services?.length ? p.services.slice(0, 2).join(", ") : TBV} />
        <Row icon={<MapPin className="w-3 h-3" />} label="Villes" value={p.cities_served?.length ? p.cities_served.slice(0, 2).join(", ") : TBV} />
        <Row label="Profil" value={`${p.profile_completion ?? 0}%`} />
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-background/60 border border-border px-2 py-1.5">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-foreground truncate">{value}</div>
    </div>
  );
}
