/**
 * UNPRO — SEO Index Health Dashboard
 * Admin tool to monitor indexing, contractor visibility, and page quality.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";
import SeoHead from "@/seo/components/SeoHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Globe, AlertTriangle, CheckCircle, FileText, Users, TrendingUp } from "lucide-react";

export default function PageSeoIndexHealth() {
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Stats
  const { data: stats } = useQuery({
    queryKey: ["seo-health-stats"],
    queryFn: async () => {
      const [contractors, pages, blogs, seoPages, cities] = await Promise.all([
        supabase.from("contractors").select("id", { count: "exact", head: true }).not("business_name", "is", null),
        supabase.from("contractor_public_pages").select("id", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("blog_articles").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("seo_pages").select("id", { count: "exact", head: true }).eq("is_published", true),
        supabase.from("cities").select("id", { count: "exact", head: true }).eq("is_active", true),
      ]);
      return {
        totalContractors: contractors.count || 0,
        publishedPages: pages.count || 0,
        blogArticles: blogs.count || 0,
        seoPages: seoPages.count || 0,
        activeCities: cities.count || 0,
        missingPages: (contractors.count || 0) - (pages.count || 0),
      };
    },
  });

  // Contractor visibility
  const { data: contractors } = useQuery({
    queryKey: ["seo-contractor-visibility"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contractors")
        .select("id, business_name, city")
        .not("business_name", "is", null)
        .order("business_name")
        .limit(100);

      const { data: pages } = await supabase
        .from("contractor_public_pages")
        .select("contractor_id, slug")
        .eq("is_published", true);

      const pageMap = new Map((pages || []).map(p => [p.contractor_id, p.slug]));
      return (data || []).map(c => ({ ...c, hasPage: pageMap.has(c.id), slug: pageMap.get(c.id) }));
    },
  });

  // Keyword search
  const handleSearch = async () => {
    if (!keyword.trim()) return;
    const k = keyword.trim().toLowerCase();
    const { data } = await supabase
      .from("contractor_public_pages")
      .select("slug, seo_title, seo_description, contractor_id")
      .eq("is_published", true);
    const matches = (data || []).filter(p =>
      p.seo_title?.toLowerCase().includes(k) ||
      p.seo_description?.toLowerCase().includes(k) ||
      p.slug?.toLowerCase().includes(k)
    );
    setSearchResults(matches);
  };

  return (
    <MainLayout>
      <SeoHead title="SEO Index Health | UNPRO Admin" description="Tableau de bord SEO interne" noindex />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">🔍 SEO Index Health</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[
            { label: "Entrepreneurs", value: stats?.totalContractors, icon: Users, color: "text-blue-400" },
            { label: "Pages publiques", value: stats?.publishedPages, icon: Globe, color: "text-green-400" },
            { label: "Manquantes", value: stats?.missingPages, icon: AlertTriangle, color: "text-red-400" },
            { label: "Articles blog", value: stats?.blogArticles, icon: FileText, color: "text-purple-400" },
            { label: "Pages SEO", value: stats?.seoPages, icon: TrendingUp, color: "text-yellow-400" },
            { label: "Villes actives", value: stats?.activeCities, icon: CheckCircle, color: "text-cyan-400" },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <s.icon className={`w-5 h-5 mx-auto mb-1 ${s.color}`} />
                <div className="text-2xl font-bold">{s.value ?? "…"}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="index-tester">
          <TabsList className="mb-4">
            <TabsTrigger value="index-tester">🔎 Index Tester</TabsTrigger>
            <TabsTrigger value="visibility">👁 Visibilité</TabsTrigger>
            <TabsTrigger value="fixes">⚡ Fast Fixes</TabsTrigger>
          </TabsList>

          {/* Live Index Tester */}
          <TabsContent value="index-tester">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" /> Tester un mot-clé
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input
                    placeholder="Ex: Zappa, isolation, plombier…"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                  />
                  <Button onClick={handleSearch}>Chercher</Button>
                </div>
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(r => (
                      <div key={r.slug} className="p-3 rounded border border-border/50">
                        <div className="font-medium">{r.seo_title}</div>
                        <div className="text-sm text-muted-foreground">/entrepreneur/{r.slug}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-green-400 border-green-500/30">Dans le sitemap</Badge>
                          <Badge variant="outline">Page publique</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : keyword ? (
                  <p className="text-muted-foreground text-sm">Aucune page trouvée contenant « {keyword} »</p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contractor Visibility */}
          <TabsContent value="visibility">
            <Card>
              <CardHeader><CardTitle>Visibilité des entrepreneurs</CardTitle></CardHeader>
              <CardContent>
                <div className="max-h-[500px] overflow-y-auto space-y-1">
                  {(contractors || []).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 rounded hover:bg-muted/20">
                      <div>
                        <span className="font-medium">{c.business_name}</span>
                        {c.city && <span className="text-muted-foreground text-sm ml-2">— {c.city}</span>}
                      </div>
                      {c.hasPage ? (
                        <Badge className="bg-green-500/20 text-green-400">✓ Page active</Badge>
                      ) : (
                        <Badge variant="destructive">✗ Pas de page</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fast Fixes */}
          <TabsContent value="fixes">
            <Card>
              <CardHeader><CardTitle>⚡ Corrections rapides</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.missingPages && stats.missingPages > 0 && (
                    <div className="p-3 rounded border border-red-500/30 bg-red-500/5">
                      <div className="font-medium text-red-400">
                        {stats.missingPages} entrepreneur(s) sans page publique
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ces entrepreneurs ne sont pas indexables par Google. Lancez la génération automatique.
                      </p>
                    </div>
                  )}
                  <div className="p-3 rounded border border-yellow-500/30 bg-yellow-500/5">
                    <div className="font-medium text-yellow-400">Vérifiez robots.txt</div>
                    <p className="text-sm text-muted-foreground">
                      Le sitemap pointe vers unpro.ca/sitemap.xml — assurez-vous qu'il est accessible.
                    </p>
                  </div>
                  <div className="p-3 rounded border border-blue-500/30 bg-blue-500/5">
                    <div className="font-medium text-blue-400">Structured Data</div>
                    <p className="text-sm text-muted-foreground">
                      JSON-LD injecté automatiquement sur la homepage et les pages entrepreneurs.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
