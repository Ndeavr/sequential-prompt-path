/**
 * UNPRO — Alex Personalized Landing Page
 * Public page for prospects accessed via unique token link.
 * Shows pre-analyzed data, AIPP score preview, and CTA to start with Alex.
 */
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, ArrowRight, Globe, Phone, Mail, Star,
  Target, MapPin, AlertTriangle, CheckCircle2, TrendingUp,
} from "lucide-react";

const PageAlexPersonalizedLanding = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("t");
  const [linkData, setLinkData] = useState<any>(null);
  const [prospect, setProspect] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }

    const load = async () => {
      // Fetch alex link by token
      const { data: link } = await supabase
        .from("prospect_alex_links")
        .select("*")
        .eq("token", token)
        .eq("is_active", true)
        .single();

      if (!link) { setLoading(false); return; }
      setLinkData(link);

      // Track open
      await supabase
        .from("prospect_alex_links")
        .update({ open_count: (link.open_count || 0) + 1, last_opened_at: new Date().toISOString() })
        .eq("id", link.id);

      // Track conversion event
      await supabase.from("prospect_conversion_events").insert({
        prospect_id: link.prospect_id,
        event_type: "link_opened",
        event_value: token,
      });

      // Fetch prospect data
      const { data: p } = await supabase
        .from("prospects")
        .select("*")
        .eq("id", link.prospect_id)
        .single();

      setProspect(p);
      setLoading(false);
    };

    load();
  }, [token]);

  const prefill = linkData?.prefill_json ?? {};
  const score = prospect?.aipp_pre_score ?? prefill.aipp_pre_score ?? 0;
  const businessName = prospect?.business_name ?? prefill.business_name ?? "Votre entreprise";
  const city = prospect?.main_city ?? prefill.city ?? "";

  const handleStartAlex = async () => {
    // Track click
    if (prospect?.id) {
      await supabase.from("prospect_conversion_events").insert({
        prospect_id: prospect.id,
        event_type: "started_onboarding",
      });
      await supabase.from("prospects").update({ status: "started_onboarding" }).eq("id", prospect.id);
    }
    // Navigate to signature onboarding with prefill
    const params = new URLSearchParams();
    if (prefill.business_name) params.set("business_name", prefill.business_name);
    if (prefill.city) params.set("city", prefill.city);
    if (prefill.category) params.set("category", prefill.category);
    if (prefill.phone) params.set("phone", prefill.phone);
    if (prefill.website) params.set("website", prefill.website);
    if (prefill.promo_code) params.set("promo", prefill.promo_code);
    if (token) params.set("prospect_token", token);
    navigate(`/signature?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement de votre analyse...</div>
      </div>
    );
  }

  if (!linkData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Lien invalide ou expiré</h2>
            <p className="text-muted-foreground mb-4">Ce lien personnalisé n'est plus actif.</p>
            <Button onClick={() => navigate("/entrepreneurs")}>Découvrir UNPRO</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreColor = score >= 70 ? "text-green-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const scoreLabel = score >= 70 ? "Bonne visibilité" : score >= 50 ? "Visibilité moyenne" : "Visibilité faible";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          Analyse personnalisée
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Bonjour, <span className="text-primary">{businessName}</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Nous avons analysé votre présence actuelle
          {city && <> dans <span className="text-foreground font-medium">{city}</span></>}.
        </p>
      </div>

      <div className="max-w-2xl mx-auto px-4 space-y-6 pb-12">
        {/* Score Card */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 to-transparent p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Score AIPP estimé</p>
                <div className={`text-5xl font-bold ${scoreColor}`}>{Math.round(score)}<span className="text-2xl text-muted-foreground">/100</span></div>
                <p className={`text-sm mt-1 ${scoreColor}`}>{scoreLabel}</p>
              </div>
              <div className="h-20 w-20 rounded-full border-4 border-current flex items-center justify-center" style={{ borderColor: score >= 70 ? '#4ade80' : score >= 50 ? '#fbbf24' : '#f87171' }}>
                <Target className={`h-8 w-8 ${scoreColor}`} />
              </div>
            </div>
          </div>
        </Card>

        {/* What we found */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ce que nous avons trouvé</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Site web", found: prospect?.has_website, icon: Globe },
                { label: "Téléphone", found: prospect?.has_phone, icon: Phone },
                { label: "Email", found: prospect?.has_email, icon: Mail },
                { label: "Avis Google", found: prospect?.has_reviews, icon: Star },
                { label: "Présence Google", found: prospect?.has_google_presence, icon: Target },
                { label: "Zone de service", found: !!city, icon: MapPin },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                  {item.found ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  )}
                  <span className="text-sm">{item.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Opportunity */}
        <Card className="border-primary/30">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-6 w-6 text-primary shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold mb-1">Opportunité identifiée</h3>
                <p className="text-sm text-muted-foreground">
                  Les entrepreneurs avec un score AIPP supérieur à 75 reçoivent en moyenne <span className="text-foreground font-medium">3x plus de demandes qualifiées</span>. 
                  Alex peut compléter et optimiser votre profil en quelques minutes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Button
          size="lg"
          className="w-full py-6 text-lg gap-3 bg-primary hover:bg-primary/90"
          onClick={handleStartAlex}
        >
          <Sparkles className="h-5 w-5" />
          Compléter ma fiche avec Alex
          <ArrowRight className="h-5 w-5" />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Gratuit • 3 minutes • Aucun engagement
        </p>
      </div>
    </div>
  );
};

export default PageAlexPersonalizedLanding;
