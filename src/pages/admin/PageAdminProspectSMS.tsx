/**
 * PageAdminProspectSMS — Admin cockpit to create prospect pages and send personalized SMS.
 * URL: /admin/prospect-sms
 */
import { Helmet } from "react-helmet-async";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

interface Prospect {
  id: string;
  slug: string;
  company_name: string;
  city: string | null;
  service: string | null;
  phone: string | null;
  visibility_score: number | null;
  activated: boolean;
  created_at: string;
}

interface SmsRow {
  id: string;
  company_name: string;
  phone: string;
  sms_variant: string;
  conversion_status: string;
  sent_at: string;
  clicked_at: string | null;
  activated_at: string | null;
  short_link: string | null;
}

interface CuriositySeq {
  id: string;
  prospect_id: string;
  phone: string;
  status: string;
  current_step: number;
  next_send_at: string;
  last_sent_at: string | null;
  meta: any;
}

export default function PageAdminProspectSMS() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [campaigns, setCampaigns] = useState<SmsRow[]>([]);
  const [curiosity, setCuriosity] = useState<CuriositySeq[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState<{ company: string; items: any[] } | null>(null);

  // form
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [city, setCity] = useState("");
  const [service, setService] = useState("");
  const [phone, setPhone] = useState("");
  const [visibility, setVisibility] = useState("62");
  const [variant, setVariant] = useState<"A" | "B" | "C" | "auto">("auto");
  const [dryRun, setDryRun] = useState(true);

  const refresh = useCallback(async () => {
    const [{ data: p }, { data: c }] = await Promise.all([
      supabase.from("prospect_pages").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("sms_campaigns").select("*").order("sent_at", { ascending: false }).limit(50),
    ]);
    setProspects((p ?? []) as Prospect[]);
    setCampaigns((c ?? []) as SmsRow[]);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!slug && companyName) setSlug(slugify(companyName));
  }, [companyName, slug]);

  async function handleCreateAndSend() {
    if (!companyName || !slug || !phone) {
      toast.error("Nom, slug et téléphone requis");
      return;
    }
    setLoading(true);
    try {
      // 1. Upsert prospect_page
      const { data: existing } = await supabase.from("prospect_pages").select("id").eq("slug", slug).maybeSingle();

      const payload = {
        slug,
        company_name: companyName,
        city: city || null,
        service: service || null,
        phone: phone || null,
        visibility_score: Number(visibility) || null,
        ai_score: Math.max(30, (Number(visibility) || 50) - 20),
        google_score: Math.min(95, (Number(visibility) || 50) + 8),
        trust_score: 78,
        territory_score: 60,
      };

      let prospectId = existing?.id;
      if (existing) {
        await supabase.from("prospect_pages").update(payload).eq("id", existing.id);
      } else {
        const { data: ins, error } = await supabase.from("prospect_pages").insert(payload).select("id").single();
        if (error) throw error;
        prospectId = ins.id;
      }

      // 2. Upsert short_link
      await supabase.from("short_links").upsert({
        slug,
        target_path: `/pro/${slug}`,
        prospect_page_id: prospectId,
      }, { onConflict: "slug" });

      // 3. Confirm before live send
      if (!dryRun) {
        const ok = window.confirm(`ENVOI LIVE SMS à ${phone} — OK ?`);
        if (!ok) { setLoading(false); return; }
      }

      // 4. Invoke send
      const { data, error: sendErr } = await supabase.functions.invoke("sms-prospect-send", {
        body: { prospect_page_id: prospectId, variant, dry_run: dryRun },
      });
      if (sendErr) throw sendErr;

      if (dryRun) {
        toast.success(`Aperçu SMS (variant ${data?.variant}) prêt — voir console`);
        console.log("[SMS PREVIEW]\n" + data?.sms_body);
      } else {
        toast.success(`SMS envoyé (variant ${data?.variant}) ✓`);
      }
      await refresh();
    } catch (e: any) {
      toast.error(e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet><title>Prospect SMS — Admin UNPRO</title></Helmet>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Prospect SMS Engine</h1>
          <p className="text-sm text-muted-foreground">
            Crée une page personnalisée + envoie le SMS variant A/B/C. Lien : <code>go.unpro.ca/&lt;slug&gt;</code>
          </p>
        </header>

        <Card className="p-5 space-y-4">
          <h2 className="font-medium">Nouveau prospect + SMS</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom entreprise</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Isolation Solution Royal" />
            </div>
            <div>
              <Label>Slug (apparaît dans le lien)</Label>
              <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder="isolation-royal" />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Terrebonne" />
            </div>
            <div>
              <Label>Service</Label>
              <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="isolation entretoit" />
            </div>
            <div>
              <Label>Téléphone (E.164)</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+15145551234" />
            </div>
            <div>
              <Label>Score visibilité (0-100)</Label>
              <Input type="number" value={visibility} onChange={(e) => setVisibility(e.target.value)} />
            </div>
            <div>
              <Label>Variant SMS</Label>
              <Select value={variant} onValueChange={(v) => setVariant(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (A/B test)</SelectItem>
                  <SelectItem value="A">A — ChatGPT curiosité</SelectItem>
                  <SelectItem value="B">B — Aperçu direct</SelectItem>
                  <SelectItem value="C">C — Opportunités détectées</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                Aperçu seulement (dry run)
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleCreateAndSend} disabled={loading}>
              {loading ? "Envoi…" : dryRun ? "Générer aperçu" : "Envoyer SMS LIVE"}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium mb-3">SMS récents</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Date</th>
                  <th>Entreprise</th>
                  <th>Tél</th>
                  <th>Var</th>
                  <th>Lien</th>
                  <th>Statut</th>
                  <th>Cliqué</th>
                  <th>Activé</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id} className="border-t border-border/40">
                    <td className="py-2 whitespace-nowrap">{new Date(c.sent_at).toLocaleString("fr-CA")}</td>
                    <td className="truncate max-w-[180px]">{c.company_name}</td>
                    <td className="whitespace-nowrap">{c.phone}</td>
                    <td>{c.sms_variant}</td>
                    <td className="text-xs">{c.short_link ? `go.unpro.ca/${c.short_link}` : "—"}</td>
                    <td><Badge variant="outline">{c.conversion_status}</Badge></td>
                    <td>{c.clicked_at ? "✓" : "—"}</td>
                    <td>{c.activated_at ? "✓" : "—"}</td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-muted-foreground">Aucun SMS envoyé</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="font-medium mb-3">Prospects récents</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2">Entreprise</th>
                  <th>Slug</th>
                  <th>Ville</th>
                  <th>Score</th>
                  <th>Activé</th>
                  <th>Lien</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.id} className="border-t border-border/40">
                    <td className="py-2">{p.company_name}</td>
                    <td><code>{p.slug}</code></td>
                    <td>{p.city ?? "—"}</td>
                    <td>{p.visibility_score ?? "—"}</td>
                    <td>{p.activated ? <Badge>✓</Badge> : "—"}</td>
                    <td><a className="text-primary underline" target="_blank" href={`/go/${p.slug}`}>/go/{p.slug}</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
