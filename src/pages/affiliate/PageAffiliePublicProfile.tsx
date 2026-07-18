/**
 * PageAffiliePublicProfile — Page publique perso d'un affilié.
 * Route: /a/:slug (et fallback pour anciens slugs directs).
 */
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ArrowRight,
  Home,
  Briefcase,
  Loader2,
  Share2,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { trackReferralEvent } from "@/hooks/useReferralAttribution";

interface AffiliatePublic {
  id: string;
  slug: string;
  referral_code: string;
  display_preference: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  affiliate_type: string;
  bio: string | null;
  avatar_url: string | null;
  primary_city: string | null;
  status: string;
}

function displayName(a: AffiliatePublic): string {
  switch (a.display_preference) {
    case "full_name":
      return [a.first_name, a.last_name].filter(Boolean).join(" ") || "un affilié UNPRO";
    case "business":
      return a.business_name || a.first_name || "un affilié UNPRO";
    case "neutral":
      return "un affilié UNPRO";
    case "first_name":
    default:
      return a.first_name || a.business_name || "un affilié UNPRO";
  }
}

export default function PageAffiliePublicProfile() {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [affiliate, setAffiliate] = useState<AffiliatePublic | null>(null);
  const [tab, setTab] = useState<"contractor" | "homeowner">(
    (params.get("t") as any) || "contractor"
  );

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!slug) return;
      setLoading(true);
      const { data } = await supabase
        .from("affiliates" as any)
        .select(
          "id, slug, referral_code, display_preference, first_name, last_name, business_name, affiliate_type, bio, avatar_url, primary_city, status"
        )
        .eq("slug", slug.toLowerCase())
        .maybeSingle<AffiliatePublic>();
      if (cancel) return;
      setAffiliate(data ?? null);
      setLoading(false);

      if (data?.referral_code) {
        try {
          localStorage.setItem(
            "unpro_ref",
            JSON.stringify({
              refCode: data.referral_code,
              capturedAt: new Date().toISOString(),
              utmSource: "affiliate_page",
            })
          );
        } catch {}
        trackReferralEvent("qr_scan_visit", data.referral_code, {
          targetType: "affiliate_page",
          metadata: { slug: data.slug },
        });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [slug]);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "UNPRO" });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Lien copié.");
      }
    } catch {}
    if (affiliate?.referral_code) {
      trackReferralEvent("link_copy", affiliate.referral_code, {
        targetType: "affiliate_page",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!affiliate || affiliate.status !== "active") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-semibold">Affilié introuvable</h1>
          <p className="mt-2 text-muted-foreground">
            Ce lien n'existe plus ou n'est pas actif.
          </p>
          <Button asChild className="mt-6">
            <Link to="/affilies">Voir le programme</Link>
          </Button>
        </div>
      </div>
    );
  }

  const name = displayName(affiliate);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>{name} vous invite sur UNPRO</title>
        <meta
          name="description"
          content={`Rejoignez UNPRO sur invitation de ${name}. Recommandation directe, sans intermédiaire.`}
        />
        <link
          rel="canonical"
          href={`https://unpro.ca/a/${affiliate.slug}`}
        />
      </Helmet>

      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <ShieldCheck className="h-3.5 w-3.5" />
            Invitation vérifiée UNPRO
          </div>
          <h1 className="mt-6 text-3xl md:text-4xl font-semibold tracking-tight">
            {name} vous invite sur <span className="text-primary">UNPRO</span>
          </h1>
          {affiliate.bio && (
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              {affiliate.bio}
            </p>
          )}
          <div className="mt-6">
            <Button variant="outline" size="sm" onClick={share} className="gap-2">
              <Share2 className="h-3.5 w-3.5" />
              Partager cette page
            </Button>
          </div>
        </div>

        <Card className="mt-10 border-border/60 bg-card/40 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="contractor" className="gap-2">
                  <Briefcase className="h-4 w-4" />
                  Entrepreneur
                </TabsTrigger>
                <TabsTrigger value="homeowner" className="gap-2">
                  <Home className="h-4 w-4" />
                  Propriétaire
                </TabsTrigger>
              </TabsList>

              <TabsContent value="contractor" className="mt-6">
                <RecommendForm
                  kind="contractor"
                  affiliateId={affiliate.id}
                  affiliateCode={affiliate.referral_code}
                />
              </TabsContent>
              <TabsContent value="homeowner" className="mt-6">
                <RecommendForm
                  kind="homeowner"
                  affiliateId={affiliate.id}
                  affiliateCode={affiliate.referral_code}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Envoyé par {name}
          {affiliate.primary_city ? ` · ${affiliate.primary_city}` : ""}
        </div>
      </div>
    </div>
  );
}

function RecommendForm({
  kind,
  affiliateId,
  affiliateCode,
}: {
  kind: "contractor" | "homeowner";
  affiliateId: string;
  affiliateCode: string;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [note, setNote] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent || busy) return;
    if (!name.trim() || (!phone.trim() && !email.trim())) {
      toast.error("Nom + téléphone ou courriel requis.");
      return;
    }
    setBusy(true);
    try {
      const [first_name, ...rest] = name.trim().split(" ");
      const last_name = rest.join(" ") || null;

      if (kind === "contractor") {
        const { error } = await (supabase as any).from("contractor_leads").insert({
          source_type: "affiliate_public_page",
          source_label: `affiliate:${affiliateCode}`,
          company_name: name.trim(),
          first_name,
          last_name,
          full_name: name.trim(),
          email: email.trim().toLowerCase() || null,
          phone: phone.trim() || null,
          city: city.trim() || null,
          province: "QC",
          created_by_affiliate_id: affiliateId,
          assigned_affiliate_id: affiliateId,
          consent_to_contact: "yes",
          consent_channel: "public_page",
          metadata_json: { note: note.trim() || null, referral_code: affiliateCode },
          lead_status: "new",
          attribution_type: "affiliate_public",
        });
        if (error) throw error;
      } else {
        // Homeowner recommendation → log via referral_events + contractor_leads variant
        await supabase.from("referral_events" as any).insert({
          referral_code: affiliateCode,
          event_type: "homeowner_recommendation",
          role: "homeowner",
          target_type: "public_page",
          metadata: {
            name,
            phone: phone || null,
            email: email || null,
            city: city || null,
            note: note || null,
            affiliate_id: affiliateId,
          },
        });
      }

      await supabase.from("affiliate_lead_events" as any).insert({
        affiliate_id: affiliateId,
        event_type: `public_page_submit:${kind}`,
        payload: { has_email: !!email, has_phone: !!phone },
      });

      setSent(true);
      toast.success("Merci ! Nous prenons contact rapidement.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Erreur. Réessayez.");
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Recommandation reçue</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          UNPRO prend contact rapidement, sans pression.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="name">
          {kind === "contractor" ? "Entreprise ou pro à recommander" : "Prénom / nom du propriétaire"}
        </Label>
        <Input
          id="name"
          className="mt-1.5"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            inputMode="tel"
            className="mt-1.5"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="email">Courriel</Label>
          <Input
            id="email"
            type="email"
            className="mt-1.5"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor="city">Ville</Label>
        <Input
          id="city"
          className="mt-1.5"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="note">Contexte / besoin (optionnel)</Label>
        <Textarea
          id="note"
          rows={3}
          className="mt-1.5"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span className="text-muted-foreground">
          Je confirme que la personne recommandée accepte d'être contactée par UNPRO.
        </span>
      </label>
      <Button type="submit" size="lg" className="w-full" disabled={busy || !consent}>
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Envoi…
          </>
        ) : (
          <>
            Envoyer la recommandation
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
