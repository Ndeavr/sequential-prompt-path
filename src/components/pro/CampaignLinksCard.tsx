/** Contractor ad links: positioning + copyable campaign links for routes that actually exist. */
import { useEffect, useState } from "react";
import { Check, Copy, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ISR_CAMPAIGN_KEYS, ISR_COPY, ISR_SLUG, isrCampaignLink, type IsrLang } from "@/lib/isrCampaign";

const CHANNELS = [
  { source: "facebook", medium: "paid_social", fr: "Publicité Facebook / Instagram", en: "Facebook / Instagram ad" },
  { source: "google", medium: "cpc", fr: "Publicité Google", en: "Google ad" },
  { source: "site_web", medium: "referral", fr: "Votre site Web", en: "Your website" },
  { source: "depliant", medium: "print", fr: "Dépliant / code QR", en: "Flyer / QR code" },
] as const;

export default function CampaignLinksCard({ lang = "fr" }: { lang?: IsrLang }) {
  const fr = lang === "fr";
  const [slug, setSlug] = useState<string | null | undefined>(undefined);
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>(CHANNELS[0]);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setSlug(null); return; }
      const { data, error } = await supabase.from("contractors").select("slug").eq("user_id", auth.user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
      setSlug(error ? null : ((data as { slug: string | null } | null)?.slug ?? ""));
    })();
  }, []);

  if (slug === undefined || slug === null) return null;
  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(null), 1800); } catch { setCopied(null); }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5" data-testid="campaign-links-card">
      <h3 className="flex items-center gap-2 text-base font-bold text-foreground"><Megaphone className="h-5 w-5 text-primary" aria-hidden />{fr ? "Vous faites déjà de la publicité?" : "Already advertising?"}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{fr ? "Transformez vos clics en demandes de rendez-vous. Utilisez votre lien UNPRO dans vos publicités, sur votre site et sur vos dépliants." : "Turn your clicks into appointment requests. Use your UNPRO link in your ads, on your website and on your flyers."}</p>
      {slug === ISR_SLUG && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label={fr ? "Où utiliser le lien" : "Where the link is used"}>
            {CHANNELS.map(c => <Button key={c.source} type="button" size="sm" variant={c.source === channel.source ? "default" : "outline"} className="min-h-11" onClick={() => setChannel(c)}>{fr ? c.fr : c.en}</Button>)}
          </div>
          <ul className="space-y-2">
            {ISR_CAMPAIGN_KEYS.flatMap(key => (["fr", "en"] as IsrLang[]).map(l => {
              const url = isrCampaignLink(window.location.origin, key, l, channel.source, channel.medium);
              return (
                <li key={`${key}-${l}`} className="flex items-center justify-between gap-2 rounded-xl border border-border p-3">
                  <div className="min-w-0"><p className="text-sm font-medium">{ISR_COPY[key][l].eyebrow} · {l.toUpperCase()}</p><p className="truncate text-xs text-muted-foreground">{url}</p></div>
                  <Button type="button" size="sm" variant="outline" className="min-h-11 shrink-0" onClick={() => void copy(url)} aria-label={fr ? "Copier le lien" : "Copy link"}>{copied === url ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}</Button>
                </li>
              );
            }))}
          </ul>
        </div>
      )}
    </section>
  );
}
