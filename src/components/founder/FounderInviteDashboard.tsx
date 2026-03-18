/**
 * UNPRO — Founder Invite Dashboard
 * Ambassador view: generate invites, view QR, copy PIN, track usage.
 * Bilingual FR/EN support.
 */
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Copy, QrCode, Key, Check, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/components/ui/LanguageToggle";
import QRCodeCard from "@/components/sharing/QRCodeCard";
import { toast } from "sonner";

const BANNED_PINS = new Set([
  "0000","1111","1234","2222","3333","4444","5555","6666","7777","8888","9999",
  "4321","9876","1212","1122","2580","6969","1000","2000",
]);

function generatePin(): string {
  let pin: string;
  do {
    pin = String(Math.floor(1000 + Math.random() * 9000));
  } while (BANNED_PINS.has(pin));
  return pin;
}

function generateRefCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(b => b.toString(36).padStart(2, "0"))
    .join("")
    .toUpperCase()
    .slice(0, 8);
}

const t = {
  title: { fr: "Invitations fondateur", en: "Founder invitations" },
  create: { fr: "Créer une invitation", en: "Create an invitation" },
  createError: { fr: "Erreur lors de la création de l'invitation", en: "Error creating invitation" },
  createSuccess: { fr: "Invitation créée !", en: "Invitation created!" },
  copied: { fr: "Copié !", en: "Copied!" },
  activeInvite: { fr: "Invitation active", en: "Active invitation" },
  uses: { fr: "utilisations", en: "uses" },
  scanLabel: { fr: "Scanner pour accéder à l'offre fondateur", en: "Scan to access the founder offer" },
  privateLink: { fr: "Lien privé", en: "Private link" },
  copy: { fr: "Copier", en: "Copy" },
  pinLabel: {
    fr: "Code PIN (à transmettre séparément)",
    en: "PIN code (share separately)",
  },
  expiresOn: { fr: "Expire le", en: "Expires on" },
  active: { fr: "Active", en: "Active" },
  expired: { fr: "Expirée", en: "Expired" },
  noInvites: { fr: "Aucune invitation créée", en: "No invitations created" },
  noInvitesSub: {
    fr: "Créez votre première invitation pour partager l'offre fondateur.",
    en: "Create your first invitation to share the founder offer.",
  },
};

interface Invite {
  id: string;
  referral_code: string;
  access_pin: string;
  status: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
}

export default function FounderInviteDashboard() {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchInvites = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("founder_invites" as any)
      .select("*")
      .eq("ambassador_user_id", user.id)
      .order("created_at", { ascending: false });
    setInvites((data ?? []) as any[]);
    setLoading(false);
  };

  useEffect(() => { fetchInvites(); }, [user?.id]);

  const createInvite = async () => {
    if (!user?.id) return;
    setCreating(true);
    const pin = generatePin();
    const code = generateRefCode();

    const { data, error } = await supabase
      .from("founder_invites" as any)
      .insert({
        ambassador_user_id: user.id,
        referral_code: code,
        access_pin: pin,
        max_uses: 5,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      toast.error(t.createError[lang]);
    } else {
      toast.success(t.createSuccess[lang]);
      setSelectedInvite(data as any);
      fetchInvites();
    }
    setCreating(false);
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success(t.copied[lang]);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getInviteUrl = (code: string) => `${window.location.origin}/fondateur?ref=${code}`;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="h-24 rounded-2xl bg-muted/20 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">{t.title[lang]}</h2>
        <Button onClick={createInvite} disabled={creating} className="gap-2 rounded-xl">
          <Plus className="h-4 w-4" />
          {t.create[lang]}
        </Button>
      </div>

      {/* Selected invite detail */}
      {selectedInvite && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Key className="h-4 w-4 text-primary" />
              {t.activeInvite[lang]}
            </h3>
            <Badge variant="outline" className="text-primary border-primary/30">
              {selectedInvite.used_count}/{selectedInvite.max_uses} {t.uses[lang]}
            </Badge>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <QRCodeCard url={getInviteUrl(selectedInvite.referral_code)} size={180} label={t.scanLabel[lang]} />
          </div>

          {/* Link */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">{t.privateLink[lang]}</label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30 text-sm text-foreground truncate font-mono">
                {getInviteUrl(selectedInvite.referral_code)}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(getInviteUrl(selectedInvite.referral_code), `link-${selectedInvite.id}`)}
                className="shrink-0 gap-1.5 rounded-xl"
              >
                {copiedField === `link-${selectedInvite.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {t.copy[lang]}
              </Button>
            </div>
          </div>

          {/* PIN */}
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium">{t.pinLabel[lang]}</label>
            <div className="flex items-center gap-2">
              <div className="flex gap-2">
                {selectedInvite.access_pin.split("").map((d, i) => (
                  <div key={i} className="h-11 w-11 rounded-xl bg-muted/30 border border-border/30 flex items-center justify-center text-lg font-bold text-foreground">
                    {d}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(selectedInvite.access_pin, `pin-${selectedInvite.id}`)}
                className="shrink-0 gap-1.5 rounded-xl"
              >
                {copiedField === `pin-${selectedInvite.id}` ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {t.copy[lang]}
              </Button>
            </div>
          </div>

          {/* Expiry */}
          {selectedInvite.expires_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t.expiresOn[lang]} {new Date(selectedInvite.expires_at).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA")}
            </div>
          )}
        </motion.div>
      )}

      {/* Invites list */}
      <div className="space-y-3">
        {invites.map(inv => (
          <motion.div
            key={inv.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setSelectedInvite(inv)}
            className={`rounded-xl border p-4 cursor-pointer transition-all hover:border-primary/30 ${
              selectedInvite?.id === inv.id ? "border-primary/40 bg-primary/5" : "border-border/30 bg-card/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <QrCode className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground font-mono">{inv.referral_code}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(inv.created_at).toLocaleDateString(lang === "fr" ? "fr-CA" : "en-CA")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={inv.status === "active" ? "default" : "secondary"} className="text-xs">
                  {inv.status === "active" ? t.active[lang] : t.expired[lang]}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {inv.used_count}/{inv.max_uses}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {invites.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <QrCode className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t.noInvites[lang]}</p>
            <p className="text-xs mt-1">{t.noInvitesSub[lang]}</p>
          </div>
        )}
      </div>
    </div>
  );
}
