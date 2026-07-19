/**
 * PageAffiliateLogin — Connexion sans mot de passe pour les affiliés.
 * Route: /affiliate/login
 * Options: téléphone (OTP SMS) ou courriel (magic link).
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Phone, Mail, ArrowRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";

export default function PageAffiliateLogin() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"input" | "otp">("input");
  const [busy, setBusy] = useState(false);
  const [affiliateName, setAffiliateName] = useState<string | null>(null);

  // Pre-fill from ?slug (deep link /go/:slug) or ?phone / ?email
  useEffect(() => {
    const slugPrefill = params.get("slug");
    const phonePrefill = params.get("phone");
    const emailPrefill = params.get("email");
    if (phonePrefill) { setPhone(phonePrefill); setTab("phone"); }
    if (emailPrefill) { setEmail(emailPrefill); setTab("email"); }
    if (slugPrefill) {
      (async () => {
        const { data } = await supabase
          .from("affiliates" as any)
          .select("first_name, phone, email")
          .eq("slug", slugPrefill.toLowerCase())
          .maybeSingle();
        const a = data as any;
        if (a) {
          setAffiliateName(a.first_name ?? null);
          if (a.phone) { setPhone(a.phone); setTab("phone"); }
          else if (a.email) { setEmail(a.email); setTab("email"); }
        }
      })();
    }
  }, [params]);

  async function sendPhoneOtp() {
    if (!phone.trim()) return toast.error("Numéro requis");
    setBusy(true);
    try {
      const cleaned = phone.replace(/\D/g, "");
      const e164 = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
      const { error } = await supabase.auth.signInWithOtp({ phone: e164 });
      if (error) throw error;
      setStep("otp");
      toast.success("Code envoyé par SMS.");
    } catch (e: any) {
      toast.error(e.message || "Impossible d'envoyer le code");
    } finally { setBusy(false); }
  }

  async function verifyPhoneOtp() {
    if (!otp.trim()) return;
    setBusy(true);
    try {
      const cleaned = phone.replace(/\D/g, "");
      const e164 = cleaned.startsWith("1") ? `+${cleaned}` : `+1${cleaned}`;
      const { error } = await supabase.auth.verifyOtp({ phone: e164, token: otp.trim(), type: "sms" });
      if (error) throw error;
      toast.success("Connexion réussie");
      nav("/affiliate", { replace: true });
    } catch (e: any) {
      toast.error(e.message || "Code invalide");
    } finally { setBusy(false); }
  }

  async function sendMagicLink() {
    if (!email.trim()) return toast.error("Courriel requis");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: { emailRedirectTo: `${window.location.origin}/affiliate` },
      });
      if (error) throw error;
      toast.success("Lien magique envoyé — vérifiez votre courriel.");
    } catch (e: any) {
      toast.error(e.message || "Envoi impossible");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <Helmet><title>Connexion partenaire · UNPRO</title></Helmet>
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              Connexion sécurisée UNPRO
            </div>
            <h1 className="mt-4 text-2xl font-semibold">
              {affiliateName ? `Bonjour ${affiliateName}` : "Espace partenaire"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Connectez-vous sans mot de passe.
            </p>
          </div>

          {step === "otp" ? (
            <div className="space-y-4">
              <div>
                <Label>Code reçu par SMS</Label>
                <Input
                  className="mt-1.5 text-lg tracking-widest text-center"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                />
              </div>
              <Button size="lg" className="w-full" onClick={verifyPhoneOtp} disabled={busy || otp.length < 4}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                Confirmer
              </Button>
              <button className="text-xs text-muted-foreground w-full text-center" onClick={() => setStep("input")}>
                Renvoyer / changer de numéro
              </button>
            </div>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="phone" className="gap-2"><Phone className="h-4 w-4" />Téléphone</TabsTrigger>
                <TabsTrigger value="email" className="gap-2"><Mail className="h-4 w-4" />Courriel</TabsTrigger>
              </TabsList>

              <TabsContent value="phone" className="mt-6 space-y-4">
                <div>
                  <Label>Numéro de téléphone mobile</Label>
                  <Input
                    className="mt-1.5"
                    inputMode="tel"
                    placeholder="514 555 0101"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button size="lg" className="w-full" onClick={sendPhoneOtp} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  Recevoir mon code
                </Button>
              </TabsContent>

              <TabsContent value="email" className="mt-6 space-y-4">
                <div>
                  <Label>Courriel</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    placeholder="vous@exemple.ca"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <Button size="lg" className="w-full" onClick={sendMagicLink} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                  Recevoir un lien de connexion
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
