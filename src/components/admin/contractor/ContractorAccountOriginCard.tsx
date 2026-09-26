/**
 * UNPRO — Bloc « Origine du compte » (fiche entrepreneur, admin uniquement).
 * Toutes les valeurs proviennent de la RPC `admin_get_contractor_account_origin`,
 * qui reconstitue l'origine réelle à partir des tables de production.
 * Aucune fiche ne doit rester ambiguë : si l'inscription, la validation ou
 * l'activation n'est pas complète, l'état est affiché explicitement.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertTriangle, Check, Copy, Gift, Link2, Loader2, X } from "lucide-react";

type OriginPayload = {
  contractor_id: string;
  origin_code: string;
  source_exact: string;
  created_at: string;
  last_action: { action: string | null; at: string | null; source: string | null };
  owner_user_id: string | null;
  email_confirmed: boolean;
  phone_confirmed: boolean;
  has_payment: boolean;
  has_active_plan: boolean;
  plan_id: string | null;
  page_published: boolean;
  public_status: string | null;
  public_slug: string | null;
  profile_complete: boolean;
  account_status: string | null;
  activation_status: string | null;
  is_activated: boolean;
  admin_verified: boolean;
  recommendation_eligible: boolean;
  free_offer: {
    offer_code: string | null;
    label: string;
    status: string | null;
    start: string | null;
    end: string | null;
    slot_number: number | null;
    city: string | null;
    category_slug: string | null;
    consent_received: boolean;
  } | null;
};

const ORIGIN_LABELS: Record<string, string> = {
  admin_created: "Créé par admin",
  import_scraping: "Importé / scraping",
  public_form: "Créé par formulaire public",
  clara: "Créé par Clara",
  sms_link: "Créé par lien SMS",
  test_e2e: "Test / E2E",
  stripe_paid: "Payé Stripe",
  manual_activation: "Activé manuellement",
  unknown: "Origine non enregistrée",
};

const COMPLETION_MESSAGE =
  "Votre place 12 mois gratuits est réservée. Complétez votre fiche pour être visible dans les recommandations UNPRO.";

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" }) : "—";

const fmtDay = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString("fr-CA", { dateStyle: "medium" }) : "—";

const YesNo = ({ value }: { value: boolean }) => (
  <span
    className={`inline-flex items-center gap-1 font-semibold ${
      value ? "text-success" : "text-muted-foreground"
    }`}
  >
    {value ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
    {value ? "Oui" : "Non"}
  </span>
);

const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 py-1.5">
    <span className="text-muted-foreground">{label}</span>
    <span className="text-right font-medium break-all">{children}</span>
  </div>
);

const ContractorAccountOriginCard = ({ contractorId }: { contractorId: string }) => {
  const [linkOpen, setLinkOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [completionUrl, setCompletionUrl] = useState<string | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-contractor-origin", contractorId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_get_contractor_account_origin", {
        _contractor_id: contractorId,
      });
      if (error) throw error;
      return data as unknown as OriginPayload | null;
    },
    enabled: !!contractorId,
  });

  const handleGenerateLink = async (rotate = false) => {
    setGenerating(true);
    setLinkNotice(null);
    try {
      const { data: res, error } = await supabase.functions.invoke("contractor-profile-invite", {
        body: { action: rotate ? "rotate" : "create", contractor_id: contractorId },
      });
      if (error) throw error;
      if (res?.url) {
        setCompletionUrl(res.url as string);
      } else if (res?.reused) {
        setCompletionUrl(null);
        setLinkNotice(res.message as string);
      } else if (res?.error) {
        throw new Error(res.error as string);
      }
    } catch {
      setLinkNotice("Le lien n'a pas pu être généré. Réessayez dans un instant.");
    } finally {
      setGenerating(false);
    }
  };

  const copyAll = async () => {
    const text = completionUrl ? `${COMPLETION_MESSAGE}\n${completionUrl}` : COMPLETION_MESSAGE;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Message et lien copiés.");
    } catch {
      toast.error("Copie impossible sur cet appareil.");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Origine du compte</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Chargement…</CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Origine du compte</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Origine indisponible pour cette fiche. Aucune donnée n'est déduite ni inventée.
        </CardContent>
      </Card>
    );
  }

  const freeOffer = data.free_offer;
  const isFreeOffer = !!freeOffer;
  const originLabel = isFreeOffer && data.origin_code === "test_e2e"
    ? ORIGIN_LABELS.public_form
    : ORIGIN_LABELS[data.origin_code] ?? ORIGIN_LABELS.unknown;

  // Une fiche 12 mois gratuits n'est jamais « payée », « vérifiée » ni « test ».
  const fullyOnboarded =
    data.is_activated && data.profile_complete && (data.has_active_plan || isFreeOffer);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Origine du compte</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">{originLabel}</Badge>
            {isFreeOffer && (
              <Badge className="gap-1 bg-amber-500/15 text-amber-600 hover:bg-amber-500/20">
                <Gift className="h-3 w-3" />
                Offre 12 mois gratuits — en attente de validation
              </Badge>
            )}
            {data.has_payment && !isFreeOffer && <Badge>Payé Stripe</Badge>}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 text-sm">
        {!fullyOnboarded && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="font-medium text-amber-700 dark:text-amber-400">
              {isFreeOffer
                ? "Offre 12 mois gratuits — en attente de validation. Inscription, validation ou activation incomplète."
                : `Fiche non activée — source : ${originLabel}`}
            </p>
          </div>
        )}

        <div className="divide-y">
          <Row label="Date de création">{fmtDate(data.created_at)}</Row>
          <Row label="Dernière action">
            {data.last_action.action
              ? `${data.last_action.action} · ${fmtDate(data.last_action.at)}`
              : fmtDate(data.last_action.at)}
          </Row>
          <Row label="Source exacte">{data.source_exact}</Row>
          <Row label="Compte utilisateur relié">
            {data.owner_user_id ?? (
              <span className="italic text-muted-foreground">Aucun compte relié</span>
            )}
          </Row>
          <Row label="Courriel confirmé">
            <YesNo value={data.email_confirmed} />
          </Row>
          <Row label="Téléphone confirmé">
            <YesNo value={data.phone_confirmed} />
          </Row>
          <Row label="Paiement">
            <YesNo value={isFreeOffer ? false : data.has_payment} />
          </Row>
          <Row label="Forfait actif">
            <YesNo value={data.has_active_plan} />
          </Row>
          <Row label="Page publique publiée">
            <YesNo value={data.page_published} />
          </Row>
          <Row label="Éligible aux recommandations">
            <YesNo value={data.recommendation_eligible} />
          </Row>
        </div>

        {isFreeOffer && (
          <>
            <Separator />
            <div>
              <p className="mb-2 font-semibold">Offre : 12 mois gratuits</p>
              <div className="divide-y">
                <Row label="Début de l'offre">{fmtDay(freeOffer!.start)}</Row>
                <Row label="Fin de l'offre">{fmtDay(freeOffer!.end)}</Row>
                <Row label="Statut de validation">
                  {data.admin_verified ? "Validée par UNPRO" : "En attente de validation UNPRO"}
                </Row>
                <Row label="Fiche complète">
                  <YesNo value={data.profile_complete} />
                </Row>
                <Row label="Téléphone confirmé">
                  <YesNo value={data.phone_confirmed} />
                </Row>
                <Row label="Courriel confirmé">
                  <YesNo value={data.email_confirmed} />
                </Row>
                <Row label="Consentement reçu">
                  <YesNo value={freeOffer!.consent_received} />
                </Row>
                <Row label="Page publique publiée">
                  <YesNo value={data.page_published} />
                </Row>
                <Row label="Éligible aux recommandations">
                  <YesNo value={data.recommendation_eligible} />
                </Row>
              </div>

              <Button
                className="mt-3 gap-1.5"
                size="sm"
                onClick={() => {
                  setLinkOpen(true);
                  if (!completionUrl) handleGenerateLink(false);
                }}
              >
                <Link2 className="h-3.5 w-3.5" />
                Envoyer lien de complétion
              </Button>
            </div>
          </>
        )}
      </CardContent>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Lien de complétion</DialogTitle>
            <DialogDescription>
              Aucun courriel ni SMS n'est envoyé automatiquement. Copiez le message et transmettez-le
              vous-même.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="rounded-lg border bg-muted/40 p-3">{COMPLETION_MESSAGE}</div>
            {generating && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Génération du lien…
              </p>
            )}
            {completionUrl && (
              <div className="break-all rounded-lg border bg-muted/40 p-3 font-mono text-xs">
                {completionUrl}
              </div>
            )}
            {linkNotice && <p className="text-muted-foreground">{linkNotice}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => handleGenerateLink(true)} disabled={generating}>
              Régénérer
            </Button>
            <Button size="sm" onClick={copyAll} disabled={generating} className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copier le message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default ContractorAccountOriginCard;
