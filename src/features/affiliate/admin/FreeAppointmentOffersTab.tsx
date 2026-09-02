/**
 * UNPRO — Admin : offres « 3 rendez-vous qualifiés offerts » (affilié uniquement).
 * Lecture seule + prochain geste prioritaire. Aucun état inventé : les compteurs
 * proviennent directement de affiliate_free_appointment_offers.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift } from "lucide-react";

type OfferRow = {
  id: string;
  affiliate_id: string;
  lead_id: string | null;
  city: string | null;
  trade: string | null;
  status: string;
  granted_appointments: number | null;
  consumed_appointments: number | null;
  promo_code_id: string | null;
  expires_at: string | null;
  created_at: string;
};

const STATUS_TONE: Record<string, string> = {
  offered: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  accepted: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  granted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  consumed: "bg-muted text-muted-foreground border-border/40",
  expired: "bg-muted text-muted-foreground border-border/40",
  revoked: "bg-red-500/10 text-red-500 border-red-500/30",
};

const STATUS_LABEL: Record<string, string> = {
  offered: "Proposée",
  accepted: "Acceptée",
  granted: "Accordée",
  consumed: "Utilisée",
  expired: "Expirée",
  revoked: "Retirée",
};

function nextAction(o: OfferRow): string {
  switch (o.status) {
    case "offered":
      return "Relancer l'entrepreneur pour qu'il accepte l'offre.";
    case "accepted":
      return "Finaliser l'activation du profil pour accorder les rendez-vous.";
    case "granted":
      return `Router les rendez-vous restants (${Math.max(0, (o.granted_appointments ?? 0) - (o.consumed_appointments ?? 0))}).`;
    case "consumed":
      return "Proposer le plan personnalisé avec le promo 50 % premier mois.";
    case "expired":
      return "Requalifier ou clore le dossier.";
    default:
      return "Aucune action.";
  }
}

export function FreeAppointmentOffersTab() {
  const q = useQuery({
    queryKey: ["admin-free-appointment-offers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("affiliate_free_appointment_offers")
        .select("id, affiliate_id, lead_id, city, trade, status, granted_appointments, consumed_appointments, promo_code_id, expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as OfferRow[];
    },
  });

  const rows = q.data ?? [];
  const byCity = rows.reduce<Record<string, number>>((acc, r) => {
    if (!r.city) return acc;
    if (!["offered", "accepted", "granted", "consumed"].includes(r.status)) return acc;
    acc[r.city] = (acc[r.city] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" /> Offres 3 rendez-vous (10 par ville)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {q.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {q.error && <p className="text-sm text-destructive">Impossible de charger les offres.</p>}
          {!q.isLoading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucune offre créée pour l'instant.</p>
          )}
          {Object.keys(byCity).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(byCity).map(([city, used]) => (
                <Badge key={city} variant="outline" className="text-xs">
                  {city} — {used}/10 places utilisées
                </Badge>
              ))}
            </div>
          )}
          {rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border/40">
                    <th className="py-2 pr-3">Ville</th>
                    <th className="py-2 pr-3">Métier</th>
                    <th className="py-2 pr-3">Statut</th>
                    <th className="py-2 pr-3">Accordés / utilisés</th>
                    <th className="py-2 pr-3">Prochain geste</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((o) => (
                    <tr key={o.id} className="border-b border-border/20">
                      <td className="py-2 pr-3">{o.city ?? "—"}</td>
                      <td className="py-2 pr-3">{o.trade ?? "—"}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[o.status] ?? ""}`}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 tabular-nums">
                        {(o.granted_appointments ?? 0)} / {(o.consumed_appointments ?? 0)}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">{nextAction(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default FreeAppointmentOffersTab;
