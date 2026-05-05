import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Sparkles, TrendingUp, Award, MapPin, Phone, Globe } from "lucide-react";

export default function PageAippPublic() {
  const { slug } = useParams();
  const [sp] = useSearchParams();
  const token = sp.get("t");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const { data: page } = await supabase
        .from("acq_aipp_pages")
        .select("contractor_id, public_token, page_slug")
        .eq("page_slug", slug)
        .maybeSingle();
      if (!page || (token && page.public_token !== token)) { setLoading(false); return; }

      const [{ data: c }, { data: score }, { data: services }, { data: media }] = await Promise.all([
        supabase.from("acq_contractors").select("*").eq("id", page.contractor_id).single(),
        supabase.from("acq_contractor_scores").select("*").eq("contractor_id", page.contractor_id).maybeSingle(),
        supabase.from("acq_contractor_services").select("*").eq("contractor_id", page.contractor_id),
        supabase.from("acq_contractor_media").select("*").eq("contractor_id", page.contractor_id).order("sort_order"),
      ]);

      let slot: any = null;
      if (c?.city) {
        const trade = (services?.[0] as any)?.category || "general";
        const { data: s } = await supabase.from("acq_territory_slots")
          .select("*").ilike("city", c.city).ilike("trade", trade).maybeSingle();
        slot = s;
      }

      // Increment view count
      await supabase
        .from("acq_aipp_pages")
        .update({ view_count: (await supabase.from("acq_aipp_pages").select("view_count").eq("contractor_id", page.contractor_id).single()).data?.view_count ?? 0 } as any)
        .eq("contractor_id", page.contractor_id);

      setData({ contractor: c, score, services: services || [], media: media || [], slot });
      setLoading(false);
    })();
  }, [slug, token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;
  if (!data?.contractor) return <div className="min-h-screen flex items-center justify-center">Page introuvable</div>;

  const { contractor: c, score, services, media } = data;
  const aippScore = score?.aipp_score ?? 0;
  const logo = media.find((m: any) => m.media_type === "logo")?.url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto max-w-5xl px-4 py-12 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-4">
          {logo && <img src={logo} alt={c.company_name} className="h-20 mx-auto" />}
          <Badge variant="secondary" className="gap-1"><Sparkles className="w-3 h-3" /> Profil AIPP UNPRO</Badge>
          <h1 className="text-4xl md:text-5xl font-bold">{c.company_name}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{c.description}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
            {c.city && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {c.city}</span>}
            {c.phone && <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {c.phone}</span>}
            {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline"><Globe className="w-4 h-4" /> Site web</a>}
            {c.rbq_number && <Badge variant="outline">RBQ {c.rbq_number}</Badge>}
          </div>
        </div>

        {/* Score */}
        <Card className="border-2 border-primary/20">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-sm uppercase tracking-wider text-muted-foreground">Score AIPP</div>
            <div className="text-7xl font-bold bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
              {aippScore}<span className="text-3xl text-muted-foreground">/100</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Évaluation automatisée de votre présence numérique, signaux de confiance et capacité de conversion.
            </p>
            {score?.signals && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {Object.entries(score.signals).slice(0, 4).map(([k, v]: any) => (
                  <div key={k} className="text-center">
                    <div className="text-2xl font-bold">{typeof v === "number" ? v : "—"}</div>
                    <div className="text-xs text-muted-foreground capitalize">{k.replace(/_/g, " ")}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        {services.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Award className="w-5 h-5" /> Services</h2>
              <div className="flex flex-wrap gap-2">
                {[...new Set(services.map((s: any) => s.service_name))].map((s: any) => (
                  <Badge key={s} variant="secondary" className="text-sm py-1.5 px-3">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-8 text-center space-y-4">
            <TrendingUp className="w-10 h-10 mx-auto" />
            <h2 className="text-2xl font-bold">Activez votre profil UNPRO</h2>
            <p className="opacity-90 max-w-md mx-auto">
              Recevez des rendez-vous qualifiés directement dans votre calendrier. Aucun lead partagé.
            </p>
            <ul className="text-left max-w-md mx-auto space-y-2 text-sm">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> Rendez-vous exclusifs</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> Profil AIPP optimisé</li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> Activation en 1 minute avec le code <strong>freetoday</strong></li>
            </ul>
            <Link to={`/activation/${c.slug}`}>
              <Button size="lg" variant="secondary" className="mt-4">Activer mon profil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
