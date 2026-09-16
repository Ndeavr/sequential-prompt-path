/**
 * UNPRO — /admin/invitations
 * File d'invitation entrepreneurs, alimentée uniquement par les données réelles.
 * Aucune invitation n'est envoyée automatiquement : la page prépare un lien
 * personnalisé vers le parcours d'activation existant.
 */
import { useMemo, useState } from "react";
import { Copy, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAdminPageTracking } from "@/hooks/useAdminPageTracking";
import {
  useContractorInvitationQueue,
  prepareInvitation,
  type InvitationQueueRow,
} from "@/hooks/useContractorInvitationQueue";

const OFFER_LABEL: Record<string, string> = {
  free_founding: "12 mois gratuits",
  express_350: "Activation Express 350 $",
  none: "Aucune offre active",
  unknown: "Service non reconnu",
};

const LIFECYCLE_LABEL: Record<string, string> = {
  validated: "Validé",
  invited: "Invitation envoyée",
  clicked: "Lien ouvert",
  registered: "Compte créé",
  onboarding_started: "Profil en cours",
  activated: "Activé",
  eligible: "Recommandable",
};

const BLOCK_LABEL: Record<string, string> = {
  do_not_contact: "Ne pas contacter",
  unsubscribed: "Désabonné",
  sms_suppressed: "SMS supprimé",
  compliance_review_required: "Revue conformité requise",
};

function OfferBadge({ row }: { row: InvitationQueueRow }) {
  const offer = row.offer ?? "unknown";
  const label = OFFER_LABEL[offer] ?? offer;
  if (offer === "free_founding") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        {label}
        {typeof row.city_remaining === "number" ? ` · ${row.city_remaining} place(s)` : ""}
      </Badge>
    );
  }
  if (offer === "express_350") {
    return <Badge className="bg-sky-500/15 text-sky-300 border border-sky-500/30">{label}</Badge>;
  }
  return <Badge variant="outline" className="text-readable-muted">{label}</Badge>;
}

export default function PageContractorInvitations() {
  useAdminPageTracking();
  const [city, setCity] = useState("Laval");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { data = [], isLoading, error, refetch, isFetching } = useContractorInvitationQueue(city);

  const counts = useMemo(() => {
    const free = data.filter((r) => r.offer === "free_founding").length;
    const express = data.filter((r) => r.offer === "express_350").length;
    const blocked = data.filter((r) => !r.contactable).length;
    return { free, express, blocked };
  }, [data]);

  const handlePrepare = async (row: InvitationQueueRow) => {
    setPendingId(row.lead_id);
    try {
      const result = await prepareInvitation(row.lead_id);
      await navigator.clipboard.writeText(result.invite_url).catch(() => undefined);
      toast.success("Lien d'invitation prêt et copié", {
        description: `${OFFER_LABEL[result.offer] ?? result.offer} — ${result.invite_url}`,
      });
      refetch();
    } catch (e) {
      const code = (e as Error).message;
      toast.error("Invitation impossible", {
        description: BLOCK_LABEL[code] ?? code,
      });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="admin-theme min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-readable">File d'invitation</h1>
          <p className="text-sm text-readable-muted">
            Offre calculée par le serveur au moment de l'affichage. Aucun envoi automatique :
            la préparation génère uniquement un lien personnalisé vers le parcours d'activation.
          </p>
        </header>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ville"
            className="sm:max-w-xs"
            aria-label="Ville"
          />
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Actualiser
          </Button>
          <div className="flex gap-2 text-xs text-readable-muted sm:ml-auto">
            <span>{counts.free} gratuite(s)</span>
            <span>·</span>
            <span>{counts.express} Express</span>
            <span>·</span>
            <span>{counts.blocked} bloquée(s)</span>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-readable-muted">
            <Loader2 className="w-4 h-4 animate-spin" /> Chargement des entreprises…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-readable">
            <div className="flex items-center gap-2 font-medium">
              <ShieldAlert className="w-4 h-4" /> Lecture impossible
            </div>
            <p className="mt-1 text-readable-muted">{(error as Error).message}</p>
          </div>
        )}

        {!isLoading && !error && data.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 text-sm text-readable-muted">
            Aucune entreprise enregistrée pour « {city} ».
          </div>
        )}

        <div className="space-y-3">
          {data.map((row) => (
            <article
              key={row.lead_id}
              className="rounded-2xl border border-border bg-card p-4 space-y-3"
            >
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-semibold text-readable">
                    {row.company_name ?? "Entreprise sans nom enregistré"}
                  </h2>
                  <OfferBadge row={row} />
                </div>
                <p className="text-xs text-readable-muted">
                  {row.trade_label ?? "Service non renseigné"} · {row.city ?? "Ville non renseignée"}
                  {row.category_slug ? ` · ${row.category_slug}` : " · catégorie non reconnue"}
                </p>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-readable-muted">
                <div>
                  <dt className="inline">Téléphone : </dt>
                  <dd className="inline text-readable">{row.phone_e164 ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline">Courriel : </dt>
                  <dd className="inline text-readable break-all">{row.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="inline">Étape : </dt>
                  <dd className="inline text-readable">
                    {LIFECYCLE_LABEL[row.lifecycle_status ?? ""] ?? row.lifecycle_status ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="inline">Dernier évènement : </dt>
                  <dd className="inline text-readable">
                    {row.last_event_at
                      ? new Date(row.last_event_at).toLocaleDateString("fr-CA")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="inline">Attribution : </dt>
                  <dd className="inline text-readable">{row.attribution_type ?? "—"}</dd>
                </div>
              </dl>

              {!row.contactable && (
                <p className="text-xs text-amber-300">
                  Contact bloqué — {BLOCK_LABEL[row.block_reason ?? ""] ?? row.block_reason}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={
                    !row.contactable ||
                    pendingId === row.lead_id ||
                    (row.offer !== "free_founding" && row.offer !== "express_350")
                  }
                  onClick={() => handlePrepare(row)}
                >
                  {pendingId === row.lead_id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  Préparer l'invitation
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
