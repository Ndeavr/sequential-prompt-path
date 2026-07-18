/**
 * PageAffilieActivation — Active le rôle affilié pour l'utilisateur.
 * Route: /affilies/activer
 * - Si connecté : formulaire court, préremplit depuis profiles.
 * - Si non connecté : redirige vers /login avec retour ici.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  useAffiliateActivation,
  type AffiliateType,
  type DisplayPreference,
} from "@/hooks/useAffiliateActivation";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";

export default function PageAffilieActivation() {
  const { user, isLoading } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { activate, loading } = useAffiliateActivation();

  const [affiliate_type, setType] = useState<AffiliateType>(
    (params.get("type") as AffiliateType) || "partner"
  );
  const [first_name, setFirst] = useState("");
  const [last_name, setLast] = useState("");
  const [business_name, setBusiness] = useState("");
  const [primary_city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website_url, setWebsite] = useState("");
  const [bio, setBio] = useState("");
  const [display_preference, setDisplay] =
    useState<DisplayPreference>("first_name");
  const [preferred_language, setLang] = useState<"fr" | "en">("fr");
  const [consent, setConsent] = useState(false);

  // Prefill from profile
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, phone, city")
        .eq("user_id", user.id)
        .maybeSingle<any>();
      if (p?.full_name) {
        const [f, ...rest] = p.full_name.split(" ");
        setFirst((v) => v || f);
        setLast((v) => v || rest.join(" "));
      }
      if (p?.phone) setPhone((v) => v || p.phone);
      if (p?.city) setCity((v) => v || p.city);
    })();
  }, [user?.id]);

  // Redirect to login if not authed
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      const returnTo = encodeURIComponent(
        `/affilies/activer${params.toString() ? `?${params.toString()}` : ""}`
      );
      navigate(`/login?returnTo=${returnTo}`, { replace: true });
    }
  }, [isLoading, user, navigate, params]);

  const canSubmit =
    consent &&
    !loading &&
    (first_name.trim() || business_name.trim());

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    await activate({
      affiliate_type,
      first_name: first_name.trim() || undefined,
      last_name: last_name.trim() || undefined,
      business_name: business_name.trim() || undefined,
      primary_city: primary_city.trim() || undefined,
      phone: phone.trim() || undefined,
      website_url: website_url.trim() || undefined,
      bio: bio.trim() || undefined,
      display_preference,
      preferred_language,
    });
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Activer mon statut d'affilié — UNPRO</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="mx-auto max-w-2xl px-6 py-14">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Activer mon statut d'affilié
          </h1>
          <p className="mt-2 text-muted-foreground">
            60 secondes. Aucun compte séparé. Vous conservez tous vos accès actuels.
          </p>
        </div>

        <Card className="border-border/60 bg-card/40 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <Label>Type d'affilié</Label>
                <Select
                  value={affiliate_type}
                  onValueChange={(v) => setType(v as AffiliateType)}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contractor">Entrepreneur</SelectItem>
                    <SelectItem value="homeowner">Propriétaire</SelectItem>
                    <SelectItem value="partner">Partenaire</SelectItem>
                    <SelectItem value="rep">Représentant</SelectItem>
                    <SelectItem value="creator">Créateur / Audience</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first">Prénom</Label>
                  <Input
                    id="first"
                    className="mt-1.5"
                    value={first_name}
                    onChange={(e) => setFirst(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="last">Nom</Label>
                  <Input
                    id="last"
                    className="mt-1.5"
                    value={last_name}
                    onChange={(e) => setLast(e.target.value)}
                  />
                </div>
              </div>

              {(affiliate_type === "contractor" ||
                affiliate_type === "partner" ||
                affiliate_type === "creator") && (
                <div>
                  <Label htmlFor="biz">Nom d'entreprise (optionnel)</Label>
                  <Input
                    id="biz"
                    className="mt-1.5"
                    value={business_name}
                    onChange={(e) => setBusiness(e.target.value)}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">Ville principale</Label>
                  <Input
                    id="city"
                    className="mt-1.5"
                    value={primary_city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    className="mt-1.5"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="site">Site web / réseau social (optionnel)</Label>
                <Input
                  id="site"
                  className="mt-1.5"
                  placeholder="https://…"
                  value={website_url}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Affichage public</Label>
                  <Select
                    value={display_preference}
                    onValueChange={(v) => setDisplay(v as DisplayPreference)}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first_name">Prénom seul</SelectItem>
                      <SelectItem value="full_name">Nom complet</SelectItem>
                      <SelectItem value="business">Nom d'entreprise</SelectItem>
                      <SelectItem value="neutral">Anonyme</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Langue préférée</Label>
                  <Select
                    value={preferred_language}
                    onValueChange={(v) => setLang(v as "fr" | "en")}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="bio">Bio courte (optionnel)</Label>
                <Textarea
                  id="bio"
                  className="mt-1.5"
                  rows={3}
                  placeholder="Qui recommandez-vous et pourquoi ?"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
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
                  Je m'engage à ne recommander UNPRO qu'à des personnes qui y
                  consentent, et j'accepte les conditions du programme.
                </span>
              </label>

              <Button
                type="submit"
                size="lg"
                className="w-full text-base"
                disabled={!canSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Activation…
                  </>
                ) : (
                  <>
                    Activer mon statut d'affilié
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Vos accès actuels sont conservés. Vous gagnez un rôle
                supplémentaire.
              </div>

              <div className="text-center text-sm">
                <Link to="/affilies" className="text-muted-foreground hover:text-foreground">
                  ← Retour au programme
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
