/**
 * UNPRO — Carte « Ma demande d'adhésion »
 * Affiche la dernière demande réellement enregistrée dans
 * `contractor_intake_sessions` (aucune donnée inventée).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2 } from "lucide-react";

interface IntakeRow {
  id: string;
  company_name: string | null;
  detected_trade: string | null;
  detected_region: string | null;
  phone: string | null;
  created_at: string;
}

export default function CardMembershipRequest() {
  const [row, setRow] = useState<IntakeRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const anon = typeof window !== "undefined" ? localStorage.getItem("unpro_intake_anon_id") : null;
      const { data: auth } = await supabase.auth.getUser();
      let query = supabase
        .from("contractor_intake_sessions")
        .select("id, company_name, detected_trade, detected_region, phone, created_at")
        .not("company_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (auth.user?.id) query = query.eq("user_id", auth.user.id);
      else if (anon) query = query.eq("anon_session_id", anon);
      else {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data, error } = await query.maybeSingle();
      if (cancelled) return;
      if (!error && data) setRow(data as IntakeRow);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-5 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Chargement de votre demande…
      </Card>
    );
  }

  if (!row) return null;

  const submitted = new Date(row.created_at).toLocaleDateString("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Ma demande d'adhésion</p>
          <h2 className="text-lg font-semibold text-foreground">{row.company_name}</h2>
        </div>
        <Badge variant="secondary" className="gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Reçue
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        {row.detected_trade && (
          <div>
            <dt className="text-muted-foreground text-xs">Service principal</dt>
            <dd className="text-foreground">{row.detected_trade}</dd>
          </div>
        )}
        {row.detected_region && (
          <div>
            <dt className="text-muted-foreground text-xs">Ville</dt>
            <dd className="text-foreground">{row.detected_region}</dd>
          </div>
        )}
        {row.phone && (
          <div>
            <dt className="text-muted-foreground text-xs">Téléphone</dt>
            <dd className="text-foreground">{row.phone}</dd>
          </div>
        )}
        <div>
          <dt className="text-muted-foreground text-xs">Envoyée le</dt>
          <dd className="text-foreground">{submitted}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground mt-4">
        Nous validons vos informations d'entreprise avant l'activation. Les éléments non confirmés restent marqués « à confirmer ».
      </p>
    </Card>
  );
}
