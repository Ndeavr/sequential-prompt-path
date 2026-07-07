/**
 * QrGeneratorPage — /qr
 * User-trackable QR code generator backed by qr_user_links + qr_scans.
 */
import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { supabase } from "@/integrations/supabase/client";
import MainLayout from "@/layouts/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Copy, Download, Share2, QrCode as QrIcon, Power } from "lucide-react";

type QrType =
  | "contractor_booking"
  | "home_passport_gold"
  | "diagnostic_photo"
  | "quote_analyzer"
  | "contractor_profile"
  | "affiliate";

interface QrTypeDef {
  id: QrType;
  label: string;
  description: string;
  buildDestination: (userId: string, shortCode: string) => string;
}

const QR_TYPES: QrTypeDef[] = [
  { id: "contractor_booking", label: "Trouver un pro", description: "Aider quelqu'un à démarrer un projet.", buildDestination: (uid) => `/pro/${uid}/book` },
  { id: "home_passport_gold", label: "Passeport Maison", description: "Créer la fiche intelligente d'une maison.", buildDestination: () => `/dashboard/passport` },
  { id: "diagnostic_photo", label: "Diagnostic IA", description: "Analyser un problème avec une photo.", buildDestination: (_, s) => `/diagnostic-photo?ref=${s}` },
  { id: "quote_analyzer", label: "Analyser une soumission", description: "Comparer ou comprendre une soumission.", buildDestination: (_, s) => `/analyser-soumissions?ref=${s}` },
  { id: "contractor_profile", label: "Inviter un entrepreneur", description: "Faire découvrir UNPRO à un professionnel.", buildDestination: (uid) => `/pro/${uid}` },
  { id: "affiliate", label: "Partager UNPRO", description: "Inviter quelqu'un à découvrir UNPRO.", buildDestination: (_, s) => `/?ref=${s}` },
];

const POST_GEN_SUBTITLES: Record<string, string> = {
  contractor_booking: "Décrivez votre projet et trouvez le bon professionnel.",
  contractor_profile: "Créez votre profil et développez votre visibilité.",
  home_passport_gold: "Centralisez l'intelligence de votre propriété.",
  diagnostic_photo: "Analysez un problème avec une simple photo.",
  quote_analyzer: "Comparez et comprenez vos soumissions.",
  affiliate: "Découvrez UNPRO — le Passeport Maison.",
};

interface UserLink {
  id: string;
  qr_type: string | null;
  short_code: string;
  destination_url: string;
  is_active: boolean | null;
  created_at: string | null;
  label: string | null;
}

interface LinkWithScans extends UserLink {
  scans: number;
}

export default function QrGeneratorPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<QrType>("affiliate");
  const [links, setLinks] = useState<LinkWithScans[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeQrSvg, setActiveQrSvg] = useState<string | null>(null);
  const [activeShort, setActiveShort] = useState<string | null>(null);

  const trackingBase = typeof window !== "undefined" ? `${window.location.origin}/r/` : "https://unpro.ca/r/";

  const loadLinks = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("qr_user_links")
      .select("id, qr_type, short_code, destination_url, is_active, created_at, label")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(50);
    const rows = (data || []) as UserLink[];
    // count scans
    const ids = rows.map((r) => r.id);
    let counts: Record<string, number> = {};
    if (ids.length) {
      const { data: scans } = await supabase
        .from("qr_scans")
        .select("link_id")
        .in("link_id", ids);
      (scans || []).forEach((s: any) => {
        if (s.link_id) counts[s.link_id] = (counts[s.link_id] || 0) + 1;
      });
    }
    setLinks(rows.map((r) => ({ ...r, scans: counts[r.id] || 0 })));
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate(`/login?redirect=${encodeURIComponent("/qr")}`);
        return;
      }
      setUserId(data.user.id);
      await loadLinks(data.user.id);
      setLoading(false);
    })();
  }, [navigate, loadLinks]);

  async function renderQr(text: string) {
    try {
      const svg = await QRCode.toString(text, { type: "svg", margin: 1, width: 280, color: { dark: "#0B1220", light: "#FFFFFF" } });
      setActiveQrSvg(svg);
    } catch {
      setActiveQrSvg(null);
    }
  }

  async function handleGenerate() {
    if (!userId) return;
    setGenerating(true);
    try {
      const typeDef = QR_TYPES.find((t) => t.id === selectedType)!;
      // Insert with placeholder destination; we'll update after we know short_code
      const { data, error } = await supabase
        .from("qr_user_links")
        .insert({
          user_id: userId,
          intent_slug: typeDef.id,
          destination_url: "pending",
          qr_type: typeDef.id,
          label: typeDef.label,
        } as any)
        .select("id, short_code")
        .single();
      if (error || !data) throw error;
      const finalDestination = typeDef.buildDestination(userId, data.short_code);
      await supabase.from("qr_user_links").update({ destination_url: finalDestination }).eq("id", data.id);
      const trackingUrl = `${trackingBase}${data.short_code}`;
      await renderQr(trackingUrl);
      setActiveShort(data.short_code);
      await loadLinks(userId);
      toast.success("QR généré");
    } catch (e: any) {
      toast.error("Impossible de générer le QR");
    } finally {
      setGenerating(false);
    }
  }

  async function copyLink(short: string) {
    await navigator.clipboard.writeText(`${trackingBase}${short}`);
    toast.success("Lien copié");
  }

  async function shareLink(short: string) {
    const url = `${trackingBase}${short}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Mon QR UNPRO", url }); } catch {}
    } else {
      await copyLink(short);
    }
  }

  async function downloadPng(short: string) {
    try {
      const canvas = document.createElement("canvas");
      await QRCode.toCanvas(canvas, `${trackingBase}${short}`, { margin: 1, width: 600, color: { dark: "#0B1220", light: "#FFFFFF" } });
      const url = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = `unpro-qr-${short}.png`;
      a.click();
    } catch {
      toast.error("Téléchargement impossible");
    }
  }

  async function toggleActive(link: LinkWithScans) {
    await supabase.from("qr_user_links").update({ is_active: !link.is_active }).eq("id", link.id);
    if (userId) await loadLinks(userId);
  }

  if (loading) {
    return <MainLayout><div className="p-6 text-center text-muted-foreground">Chargement…</div></MainLayout>;
  }

  return (
    <MainLayout>
      <Helmet><title>Partager UNPRO</title></Helmet>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><QrIcon className="w-5 h-5 text-primary" /></div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Partager UNPRO</h1>
            <p className="text-sm text-muted-foreground">Invitez quelqu'un à découvrir UNPRO.</p>
          </div>
        </header>

        <Card className="p-4 space-y-4">
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QR_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className={`text-left p-3 rounded-xl border transition ${
                    selectedType === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <div className="text-sm font-semibold">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">{t.description}</div>
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={generating} className="w-full h-12 rounded-xl">
            {generating ? "Création…" : "Créer mon QR"}
          </Button>
        </Card>

        {activeQrSvg && activeShort && (
          <Card className="p-6 flex flex-col items-center gap-4 rounded-2xl">
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold tracking-tight">Scannez pour découvrir UNPRO</h2>
              <p className="text-sm text-muted-foreground">{POST_GEN_SUBTITLES[selectedType]}</p>
            </div>
            <div dangerouslySetInnerHTML={{ __html: activeQrSvg }} className="bg-white p-3 rounded-xl" />
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => copyLink(activeShort)}><Copy className="w-4 h-4 mr-1" />Copier</Button>
              <Button variant="outline" className="flex-1" onClick={() => downloadPng(activeShort)}><Download className="w-4 h-4 mr-1" />PNG</Button>
              <Button variant="outline" className="flex-1" onClick={() => shareLink(activeShort)}><Share2 className="w-4 h-4 mr-1" />Partager</Button>
            </div>
          </Card>
        )}

        <section>
          <h2 className="text-lg font-bold mb-3">Mes partages</h2>
          {links.length === 0 ? (
            <p className="text-sm text-muted-foreground">Vos partages apparaîtront ici.</p>
          ) : (
            <div className="space-y-2">
              {links.map((l) => (
                <Card key={l.id} className="p-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{l.label || "Partage UNPRO"}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(l.short_code)} aria-label="Copier"><Copy className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(l)} aria-label="Activer/Désactiver">
                    <Power className={`w-4 h-4 ${l.is_active ? "text-emerald-500" : "text-muted-foreground"}`} />
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </MainLayout>
  );
}
