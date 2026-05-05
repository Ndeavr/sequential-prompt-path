import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ExternalLink, Mail, Plus, Sparkles } from "lucide-react";

type Row = {
  id: string;
  company_name: string;
  slug: string;
  email: string | null;
  website: string | null;
  status: string;
  city: string | null;
  rbq_number: string | null;
  created_at: string;
};

export default function PageAdminAcquisition() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [pages, setPages] = useState<Record<string, { page_slug: string; public_token: string }>>({});

  const load = async () => {
    const { data } = await supabase
      .from("acq_contractors")
      .select("id, company_name, slug, email, website, status, city, rbq_number, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setRows((data as any) || []);
    if (data?.length) {
      const ids = data.map((r: any) => r.id);
      const { data: pgs } = await supabase
        .from("acq_aipp_pages")
        .select("contractor_id, page_slug, public_token")
        .in("contractor_id", ids);
      const map: any = {};
      (pgs || []).forEach((p: any) => (map[p.contractor_id] = p));
      setPages(map);
    }
  };

  useEffect(() => { load(); }, []);

  const enrich = async (overrideWeb?: string, overrideEmail?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("acq-enrich-contractor", {
        body: {
          website: overrideWeb || website,
          email: overrideEmail || email,
        },
      });
      if (error) throw error;
      toast.success(`Profil créé : ${data.slug} (score ${data.score ?? "—"})`);
      setWebsite(""); setEmail("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "Erreur enrichissement");
    } finally { setLoading(false); }
  };

  const sendInvite = async (contractor_id: string) => {
    try {
      const { error } = await supabase.functions.invoke("acq-send-invite", {
        body: { contractor_id, base_url: window.location.origin },
      });
      if (error) throw error;
      toast.success("Invitation envoyée");
    } catch (e: any) {
      toast.error(e.message || "Erreur envoi");
    }
  };

  const copyInviteUrl = (r: Row) => {
    const p = pages[r.id];
    if (!p) return toast.error("Aucune page AIPP");
    const url = `${window.location.origin}/aipp/${p.page_slug}?t=${p.public_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Acquisition Entrepreneurs</h1>
          <p className="text-muted-foreground">Pipeline AIPP — enrichissement → score → invitation → activation</p>
        </div>
        <Button
          size="lg"
          onClick={() => enrich("https://isroyal.ca", "info@isroyal.ca")}
          disabled={loading}
          className="gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Créer ISR maintenant
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nouvel entrepreneur</CardTitle></CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input placeholder="https://site.ca" value={website} onChange={(e) => setWebsite(e.target.value)} className="flex-1 min-w-[240px]" />
          <Input placeholder="info@site.ca" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 min-w-[240px]" />
          <Button onClick={() => enrich()} disabled={loading || (!website && !email)}>Enrichir + scorer</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Profils ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rows.map((r) => {
              const p = pages[r.id];
              return (
                <div key={r.id} className="flex items-center justify-between border rounded-lg p-3 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{r.company_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.city || "—"} · {r.email || "no email"} · RBQ {r.rbq_number || "—"}
                    </div>
                  </div>
                  <Badge variant={r.status === "active" ? "default" : "secondary"} className="mr-2">{r.status}</Badge>
                  {p && (
                    <Link to={`/aipp/${p.page_slug}?t=${p.public_token}`} target="_blank">
                      <Button size="sm" variant="ghost"><ExternalLink className="w-3 h-3" /></Button>
                    </Link>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => copyInviteUrl(r)}>Copier lien</Button>
                  <Button size="sm" variant="outline" onClick={() => sendInvite(r.id)} className="gap-1">
                    <Mail className="w-3 h-3" /> Inviter
                  </Button>
                  <Link to={`/activation/${r.slug}`} target="_blank">
                    <Button size="sm" className="ml-2">Activer</Button>
                  </Link>
                </div>
              );
            })}
            {!rows.length && <div className="text-sm text-muted-foreground p-4 text-center">Aucun entrepreneur. Cliquez sur « Créer ISR maintenant ».</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
