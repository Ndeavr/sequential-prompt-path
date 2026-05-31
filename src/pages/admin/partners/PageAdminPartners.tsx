import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function PageAdminPartners() {
  const qc = useQueryClient();
  const [running, setRunning] = useState<string | null>(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("signature_partners")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  async function rescrape(slug: string, source_url: string) {
    setRunning(slug);
    try {
      const { data, error } = await supabase.functions.invoke("partner-scrape-enrich", {
        body: { slug, source_url },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error ?? error?.message);
      toast.success(`${slug} ré-enrichi`);
      qc.invalidateQueries({ queryKey: ["admin-partners"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur scrape");
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Partenaires Signature</h1>
      {isLoading && <Loader2 className="animate-spin" />}
      <div className="space-y-3">
        {partners.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between p-4 rounded-[18px] border border-border bg-card">
            <div>
              <div className="font-semibold">{p.display_name}</div>
              <div className="text-sm text-muted-foreground">
                /{p.slug} · {p.tier} · {p.enriched_at ? `enrichi ${new Date(p.enriched_at).toLocaleString("fr-CA")}` : "jamais enrichi"}
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={`/${p.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" /> Voir page
                </a>
              </Button>
              <Button
                size="sm"
                disabled={!p.source_url || running === p.slug}
                onClick={() => rescrape(p.slug, p.source_url)}
              >
                {running === p.slug
                  ? <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  : <RefreshCcw className="h-4 w-4 mr-1" />}
                Re-scrape
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
