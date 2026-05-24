/**
 * UNPRO — AIPP Import Center (Admin)
 * Cinematic Dark — import an entrepreneur website, preview extracted entity, publish.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Globe, Sparkles, CheckCircle2, ExternalLink, Calculator } from "lucide-react";

export default function PageAippImport() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [persisting, setPersisting] = useState(false);
  const [entity, setEntity] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const runImport = async (persist: boolean) => {
    if (!url) return toast.error("URL requise");
    persist ? setPersisting(true) : setLoading(true);
    setEntity(null);
    try {
      const { data, error } = await supabase.functions.invoke("aipp-import-website", {
        body: { url, persist },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? "Erreur d'extraction");
      setEntity(data.entity);
      setProfileId(data.profile_id ?? null);
      toast.success(persist ? "Profil créé (brouillon)" : "Extraction réussie");
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur");
    } finally {
      setLoading(false);
      setPersisting(false);
    }
  };

  const publish = async () => {
    if (!profileId) return;
    const { error } = await supabase
      .from("aipp_profiles" as any)
      .update({ public_status: "published" })
      .eq("id", profileId);
    if (error) return toast.error(error.message);
    toast.success("Profil publié");
  };

  const recalc = async () => {
    if (!profileId) return;
    const { data, error } = await supabase.functions.invoke("aipp-recalc-score", {
      body: { profile_id: profileId },
    });
    if (error || !data?.ok) return toast.error(error?.message ?? data?.error ?? "Erreur");
    toast.success(`Score recalculé : ${data.total}/100`);
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">AIPP — Import Center</h1>
            <p className="text-white/60 mt-1">Extraire une entité entrepreneur depuis un site web.</p>
          </div>
          <Link to="/admin/aipp-profiles" className="text-sm text-cyan-300 hover:text-cyan-200">
            Voir tous les profils →
          </Link>
        </header>

        <Card className="bg-white/[0.04] border-white/10 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Globe className="w-5 h-5 text-cyan-400" /> Source
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="https://exemple.ca"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => runImport(false)} disabled={loading || persisting}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Extraire (prévisualiser)
              </Button>
              <Button variant="secondary" onClick={() => runImport(true)} disabled={loading || persisting}>
                {persisting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                Extraire + Créer brouillon
              </Button>
            </div>
          </CardContent>
        </Card>

        {entity && (
          <Card className="bg-white/[0.04] border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">{entity.display_name}</CardTitle>
              <div className="flex gap-2">
                {profileId && (
                  <>
                    <Button size="sm" variant="outline" onClick={recalc}>
                      <Calculator className="w-4 h-4 mr-1" /> Score
                    </Button>
                    <Button size="sm" onClick={publish}>
                      Publier
                    </Button>
                    <Link to={`/ai-indexed-profiles/${entity.slug}`} target="_blank">
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="w-4 h-4 mr-1" /> Aperçu
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{entity.primary_trade}</Badge>
                {entity.primary_city && <Badge variant="outline">{entity.primary_city}</Badge>}
                <Badge variant="outline">slug: {entity.slug}</Badge>
              </div>
              {entity.short_summary && (
                <p className="text-white/80">{entity.short_summary}</p>
              )}
              {entity.long_summary && (
                <details className="text-white/70">
                  <summary className="cursor-pointer text-white/90">Résumé long</summary>
                  <p className="mt-2 whitespace-pre-wrap">{entity.long_summary}</p>
                </details>
              )}
              {entity.services?.length > 0 && (
                <div>
                  <div className="text-white/90 mb-1">Services ({entity.services.length})</div>
                  <ul className="list-disc pl-5 text-white/70 space-y-1">
                    {entity.services.map((s: any, i: number) => (
                      <li key={i}><span className="text-white">{s.label}</span>{s.category && ` — ${s.category}`}</li>
                    ))}
                  </ul>
                </div>
              )}
              {entity.service_areas?.length > 0 && (
                <div>
                  <div className="text-white/90 mb-1">Zones desservies</div>
                  <div className="flex flex-wrap gap-1">
                    {entity.service_areas.map((a: any, i: number) => (
                      <Badge key={i} variant="secondary">{a.city}{a.region ? `, ${a.region}` : ""}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <details>
                <summary className="cursor-pointer text-white/80">JSON brut</summary>
                <pre className="mt-2 p-3 bg-black/40 rounded text-xs overflow-auto max-h-96">
                  {JSON.stringify(entity, null, 2)}
                </pre>
              </details>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
