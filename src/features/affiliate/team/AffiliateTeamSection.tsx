/**
 * UNPRO — Section « Bâtissez votre équipe » (sous-affiliés, override 5 %)
 * Réutilise le système d'affiliation existant : aucun nouveau moteur de commission.
 * Données via RPC serveur `get_my_affiliate_team` / `get_my_affiliate_earnings`.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users, Copy, Share2, MessageSquare, Mail, Facebook, DollarSign, TrendingUp, UserPlus,
} from "lucide-react";

type TeamRow = {
  affiliate_id: string;
  affiliate_name: string;
  status: string | null;
  joined_at: string | null;
  recruited_at: string | null;
  eligible_revenue_cents: number;
  override_commission_cents: number;
  last_sale_at: string | null;
};

type Earnings = {
  is_affiliate: boolean;
  direct_commission_cents?: number;
  override_commission_cents?: number;
  total_commission_cents?: number;
  team_revenue_cents?: number;
  recruits_count?: number;
  active_recruits_count?: number;
  override_pct?: number;
};

function money(cents?: number | null) {
  return `${((cents ?? 0) / 100).toLocaleString("fr-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} $`;
}

function dateFr(v?: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("fr-CA", { day: "2-digit", month: "short", year: "numeric" });
}

const STATUS_TONE: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  suspended: "bg-red-500/10 text-red-600 border-red-500/30",
};

export function AffiliateTeamSection({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);

  const origin = typeof window !== "undefined" ? window.location.origin : "https://unpro.ca";
  const link = `${origin}/affilies?ref=${encodeURIComponent(referralCode)}&intent=join`;

  const earningsQ = useQuery({
    queryKey: ["affiliate-earnings"],
    queryFn: async (): Promise<Earnings> => {
      const { data, error } = await (supabase as any).rpc("get_my_affiliate_earnings");
      if (error) throw error;
      return (data ?? { is_affiliate: false }) as Earnings;
    },
  });

  const teamQ = useQuery({
    queryKey: ["affiliate-team"],
    queryFn: async (): Promise<TeamRow[]> => {
      const { data, error } = await (supabase as any).rpc("get_my_affiliate_team");
      if (error) throw error;
      return (data ?? []) as TeamRow[];
    },
  });

  const e = earningsQ.data;
  const team = teamQ.data ?? [];
  const pct = e?.override_pct ?? 5;

  const message = useMemo(
    () =>
      `Je fais partie du programme d'affiliés UNPRO. Tu peux générer des revenus en présentant UNPRO aux entrepreneurs. Inscris-toi ici : ${link}`,
    [link],
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Lien de recrutement copié");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Programme affiliés UNPRO", text: message, url: link });
        return;
      } catch { /* annulé */ }
    }
    copy();
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" /> Bâtissez votre équipe UNPRO
        </h2>
        <span className="text-xs text-muted-foreground hidden sm:block">
          {pct} % sur les ventes de vos recrues, payé par UNPRO
        </span>
      </div>

      {/* Lien de recrutement */}
      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Votre lien de recrutement</p>
          <p className="text-xs text-muted-foreground">
            Chaque affilié recruté garde 100 % de sa commission. UNPRO vous verse {pct} % en plus sur ses ventes admissibles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <code className="flex-1 min-w-0 truncate rounded-xl bg-muted/50 px-3 py-3 text-xs font-mono text-foreground">
            {link}
          </code>
          <Button variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={copy} aria-label="Copier le lien">
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Button onClick={share} className="h-11 col-span-2 sm:col-span-1">
            <Share2 className="h-4 w-4 mr-1" /> Partager
          </Button>
          <Button variant="outline" className="h-11" asChild>
            <a href={`sms:?&body=${encodeURIComponent(message)}`}>
              <MessageSquare className="h-4 w-4 mr-1" /> SMS
            </a>
          </Button>
          <Button variant="outline" className="h-11" asChild>
            <a href={`mailto:?subject=${encodeURIComponent("Programme affiliés UNPRO")}&body=${encodeURIComponent(message)}`}>
              <Mail className="h-4 w-4 mr-1" /> Courriel
            </a>
          </Button>
          <Button variant="outline" className="h-11" asChild>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`} target="_blank" rel="noreferrer">
              <Facebook className="h-4 w-4 mr-1" /> Facebook
            </a>
          </Button>
          <Button variant="outline" className="h-11" asChild>
            <a href={`fb-messenger://share/?link=${encodeURIComponent(link)}`}>
              <MessageSquare className="h-4 w-4 mr-1" /> Messenger
            </a>
          </Button>
        </div>
      </div>

      {/* Commissions séparées */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border/40 bg-card p-4">
          <div className="text-xs text-muted-foreground">Mes commissions</div>
          <div className="text-xl font-semibold tabular-nums text-foreground">{money(e?.direct_commission_cents)}</div>
          <div className="text-[11px] text-muted-foreground">Vos ventes directes</div>
        </div>
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <DollarSign className="h-3 w-3" /> Commission équipe
          </div>
          <div className="text-xl font-semibold tabular-nums text-primary">{money(e?.override_commission_cents)}</div>
          <div className="text-[11px] text-muted-foreground">{pct} % des ventes de vos recrues</div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <UserPlus className="h-3 w-3" /> Recrues
          </div>
          <div className="text-xl font-semibold tabular-nums text-foreground">
            {e?.recruits_count ?? 0}
            <span className="text-xs text-muted-foreground font-normal"> · {e?.active_recruits_count ?? 0} actives</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border/40 bg-card p-4">
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Revenus d'équipe
          </div>
          <div className="text-xl font-semibold tabular-nums text-foreground">{money(e?.team_revenue_cents)}</div>
        </div>
      </div>

      {/* Liste des recrues */}
      {teamQ.isLoading ? (
        <div className="rounded-2xl border border-border/40 bg-card p-6 text-center text-sm text-muted-foreground">
          Chargement de votre équipe…
        </div>
      ) : team.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-card p-6 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Aucune recrue pour l'instant</p>
          <p className="text-xs text-muted-foreground">
            Exemple : une vente de 350 $ réalisée par votre recrue vous rapporte {(350 * (pct / 100)).toFixed(2)} $, sans rien lui enlever.
          </p>
          <Button variant="outline" className="h-11 mt-1" onClick={share}>
            <Share2 className="h-4 w-4 mr-1" /> Inviter un premier affilié
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
          <ul className="divide-y divide-border/40">
            {team.map((t) => (
              <li key={t.affiliate_id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">{t.affiliate_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Recrue depuis {dateFr(t.recruited_at ?? t.joined_at)}
                    {t.last_sale_at ? ` · dernière vente ${dateFr(t.last_sale_at)}` : ""}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm tabular-nums text-foreground">{money(t.eligible_revenue_cents)}</div>
                  <div className="text-xs tabular-nums text-primary font-medium">
                    +{money(t.override_commission_cents)}
                  </div>
                </div>
                <Badge variant="outline" className={STATUS_TONE[t.status ?? ""] ?? "text-muted-foreground"}>
                  {t.status ?? "—"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export default AffiliateTeamSection;
