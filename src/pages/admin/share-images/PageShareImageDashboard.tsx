import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Image, Layout, Zap, BarChart3, Plus, ArrowRight, Clock, Eye } from "lucide-react";
import { listGenerations } from "@/services/shareImageService";
import type { ShareImageGeneration } from "@/services/shareImageService";
import { INTENTS } from "@/services/shareImageService";

export default function PageShareImageDashboard() {
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<ShareImageGeneration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const gens = await listGenerations(20);
      setGenerations(gens);
    } catch {
      // Use empty state
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    total: generations.length,
    avgTime: generations.length
      ? Math.round(generations.reduce((s, g) => s + (g.generation_time_ms || 0), 0) / generations.length)
      : 0,
    byIntent: INTENTS.map((i) => ({
      ...i,
      count: generations.filter((g) => g.intent === i.value).length,
    })),
  };

  const navCards = [
    { title: "Templates", desc: "Gérer les modèles d'images", icon: Layout, path: "/admin/share-images/templates" },
    { title: "Générer", desc: "Créer une image OG", icon: Zap, path: "/admin/share-images/generate" },
    { title: "Historique", desc: "Toutes les générations", icon: Clock, path: "/admin/share-images/history" },
    { title: "Preview", desc: "Tester les rendus multi-device", icon: Eye, path: "/admin/share-images/preview" },
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Share Card Image Generator</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Générez des images OG dynamiques pour SMS, email et réseaux sociaux
          </p>
        </div>
        <Button onClick={() => navigate("/admin/share-images/generate")}>
          <Plus className="h-4 w-4 mr-2" /> Générer
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <Image className="h-5 w-5 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Images générées</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-amber-400" />
            <p className="text-2xl font-bold">{stats.avgTime}ms</p>
            <p className="text-xs text-muted-foreground">Temps moyen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Layout className="h-5 w-5 mx-auto mb-2 text-emerald-400" />
            <p className="text-2xl font-bold">{INTENTS.length}</p>
            <p className="text-xs text-muted-foreground">Types de cartes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-5 w-5 mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold">3</p>
            <p className="text-xs text-muted-foreground">Variantes A/B</p>
          </CardContent>
        </Card>
      </div>

      {/* Nav Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {navCards.map((c) => (
          <Card
            key={c.path}
            className="cursor-pointer hover:border-primary/30 transition-all"
            onClick={() => navigate(c.path)}
          >
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <c.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{c.title}</p>
                <p className="text-sm text-muted-foreground">{c.desc}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Intent breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Répartition par intention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {stats.byIntent.map((i) => (
            <div key={i.value} className="flex items-center justify-between">
              <span className="text-sm">
                {i.icon} {i.label}
              </span>
              <Badge variant="secondary">{i.count}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Recent generations */}
      {generations.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Dernières générations</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/share-images/history")}>
              Tout voir <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {generations.slice(0, 4).map((g) => (
                <div key={g.id} className="space-y-2">
                  {g.generated_image_url ? (
                    <img
                      src={g.generated_image_url}
                      alt={g.intent || "OG Image"}
                      className="w-full aspect-[1200/630] rounded-lg object-cover border border-border/50"
                    />
                  ) : (
                    <div className="w-full aspect-[1200/630] rounded-lg bg-muted flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {g.intent || "—"}
                    </Badge>
                    {g.generation_time_ms && (
                      <span className="text-[10px] text-muted-foreground">{g.generation_time_ms}ms</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
