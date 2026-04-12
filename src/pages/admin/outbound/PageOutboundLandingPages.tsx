import AdminLayout from "@/layouts/AdminLayout";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Globe, ExternalLink, MapPin, Star, Eye } from "lucide-react";

export default function PageOutboundLandingPages() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("outbound_landing_pages").select("*").order("created_at", { ascending: false }).limit(100);
    setPages(data || []);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/outbound")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-display text-xl font-bold">Landing Pages</h1>
          <p className="text-sm text-muted-foreground">Pages personnalisées go.unpro.ca</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground animate-pulse">Chargement…</div>
      ) : pages.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="py-12 text-center">
            <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">Aucune landing page</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {pages.map(p => (
            <Card key={p.id} className="border-border/40">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm truncate">{p.hero_title || p.page_slug}</CardTitle>
                  <Badge className={p.page_status === "published" ? "bg-emerald-500/20 text-emerald-400" : "bg-muted text-muted-foreground"} >
                    {p.page_status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-2">{p.hero_subtitle}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{p.city}</span>
                  <span className="flex items-center gap-1"><Star className="h-3 w-3" />{p.specialty}</span>
                  <span>{p.language?.toUpperCase()}</span>
                </div>
                {p.page_url && (
                  <a href={p.page_url} target="_blank" rel="noopener" className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <ExternalLink className="h-3 w-3" /> {p.page_url}
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
