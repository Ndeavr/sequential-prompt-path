/**
 * UNPRO — Ad Landing → AIPP Entry
 * Conversion-optimized landing page for paid traffic.
 * Mobile-first, ultra-premium, zero friction.
 */
import { useState, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight, ArrowDown, Shield, Zap, Target, Brain,
  CheckCircle, XCircle, Users, TrendingUp, MessageCircle,
  Sparkles, Calendar, Star
} from "lucide-react";
import AippQuickCheckForm from "@/components/ad-landing/AippQuickCheckForm";
import AippLoadingSequence from "@/components/ad-landing/AippLoadingSequence";
import AippQuickResultCard from "@/components/ad-landing/AippQuickResultCard";
import { computeRealAIPPScore, computeQuickAIPPScore, type AIPPQuickResult } from "@/services/aippQuickScoreService";
import { supabase } from "@/integrations/supabase/client";

type Phase = "form" | "loading" | "result";

export default function PageAdLandingAipp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState<Phase>("form");
  const [result, setResult] = useState<AIPPQuickResult | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const scoreRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const trackEvent = useCallback(async (eventName: string, pageName: string, meta?: Record<string, string | number | boolean>) => {
    try {
      await supabase.from("landing_cta_events" as never).insert({
        session_id: sessionId || null,
        event_name: eventName,
        page_name: pageName,
        metadata_json: (meta as Record<string, string | number | boolean>) ?? {},
      } as never);
    } catch { /* silent */ }
  }, [sessionId]);

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const source = searchParams.get("utm_source") || searchParams.get("source") || "direct";
    const campaign = searchParams.get("utm_campaign") || searchParams.get("campaign") || null;
    const variant = searchParams.get("v") || null;
    const isMobile = window.innerWidth < 768;
    const { data } = await supabase.from("lead_capture_sessions" as never).insert({
      source_channel: source,
      campaign_name: campaign,
      landing_variant: variant,
      device_type: isMobile ? "mobile" : "desktop",
      status: "started",
    } as never).select("id").single() as { data: { id: string } | null };
    if (data) { setSessionId(data.id); return data.id; }
    return null;
  }, [sessionId, searchParams]);

  const handleFormSubmit = useCallback(async (data: {
    business_name: string; city: string; website_url: string; phone: string; google_profile_url: string;
  }) => {
    setIsScanning(true);
    setPhase("loading");
    const sid = await ensureSession();

    try {
      // Call real scan edge function
      const { data: scanData, error } = await supabase.functions.invoke("aipp-real-scan", {
        body: {
          website_url: data.website_url || undefined,
          phone: data.phone || undefined,
        },
      });

      if (!error && scanData?.success && scanData.signals) {
        // Use real scraped data
        const scored = computeRealAIPPScore(scanData.signals, data.phone);
        scored.screenshot = scanData.screenshot || null;

        const detectedName = scanData.signals.business_name_detected || data.business_name || scanData.normalized_url || "";
        const detectedCity = scanData.signals.cities_detected?.[0] || data.city || "";

        setBusinessName(detectedName);
        setBusinessCity(detectedCity);
        setResult(scored);

        // Persist
        try {
          await supabase.from("aipp_score_checks" as never).insert({
            session_id: sid || null,
            business_name: detectedName,
            city: detectedCity,
            website_url: scanData.normalized_url || data.website_url || null,
            phone: data.phone || (scanData.signals.phones_found?.[0]) || null,
            quick_score: scored.score,
            score_label: scored.label,
            market_position_label: scored.marketPosition,
          } as never);
        } catch { /* silent */ }

        try {
          sessionStorage.setItem("unpro_aipp_prefill", JSON.stringify({
            businessName: detectedName,
            city: detectedCity,
            phone: data.phone || scanData.signals.phones_found?.[0] || "",
            website: scanData.normalized_url || data.website_url || "",
          }));
        } catch {}

        trackEvent("aipp_real_scan_complete", "ad_landing", { score: scored.score });
      } else {
        // Fallback to quick score
        const scored = computeQuickAIPPScore(data);
        setBusinessName(data.business_name || data.website_url);
        setBusinessCity(data.city);
        setResult(scored);
        trackEvent("aipp_fallback_score", "ad_landing", { score: scored.score });
      }
    } catch (err) {
      console.error("Scan error:", err);
      const scored = computeQuickAIPPScore(data);
      setBusinessName(data.business_name || data.website_url);
      setBusinessCity(data.city);
      setResult(scored);
    } finally {
      setIsScanning(false);
    }
  }, [ensureSession, trackEvent]);

  const handleLoadingComplete = useCallback(() => setPhase("result"), []);

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    trackEvent("cta_see_score", "ad_landing");
  };

  return (
    <>
      <Helmet>
        <title>Découvrez votre score AIPP gratuit | UNPRO</title>
        <meta name="description" content="Arrêtez d'acheter des clics. Découvrez votre score AIPP et voyez si votre entreprise est vraiment prête à être recommandée par l'IA." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/8 via-background to-secondary/5 pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="relative max-w-2xl mx-auto px-5 text-center">
            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary text-xs">
                <Sparkles className="h-3 w-3 mr-1" /> Analyse gratuite en 30 secondes
              </Badge>
              <h1 className="text-3xl md:text-5xl font-black text-foreground leading-[1.1] mb-4">
                Arrêtez d'acheter des clics.{" "}
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Recevez des rendez-vous qualifiés.
                </span>
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
                Entrez simplement votre site web ou votre numéro de téléphone. On s'occupe du reste.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="h-13 text-base font-bold px-8" onClick={scrollToForm}>
                  Voir mon score gratuit <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button size="lg" variant="ghost" className="text-muted-foreground" onClick={() => {
                  document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
                  trackEvent("cta_how_it_works", "ad_landing");
                }}>
                  Comment ça fonctionne <ArrowDown className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          </div>
          <div className="max-w-2xl mx-auto px-5 mt-10">
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              {["Gratuit", "Sans engagement", "Résultat instantané", "100% confidentiel"].map((t) => (
                <div key={t} className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" /> {t}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── PROBLEM SECTION ─── */}
        <section className="py-14 bg-muted/30">
          <div className="max-w-2xl mx-auto px-5">
            <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-8">
              Vous investissez peut-être au mauvais endroit
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { icon: XCircle, text: "Vous payez pour des clics qui ne convertissent pas" },
                { icon: Users, text: "Vos leads sont partagés avec 5+ concurrents" },
                { icon: TrendingUp, text: "Vous êtes noyé dans la compétition locale" },
                { icon: Target, text: "Vos meilleurs clients ne vous trouvent pas" },
              ].map((p) => (
                <Card key={p.text} className="border-destructive/10 bg-destructive/3">
                  <CardContent className="p-4 flex items-start gap-3">
                    <p.icon className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground font-medium">{p.text}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              {[
                "Aucun lead partagé — chaque rendez-vous est exclusif",
                "Pas de clics vides — seulement des clients prêts à agir",
                "Votre agenda se remplit — pas vos statistiques",
              ].map((c) => (
                <div key={c} className="flex items-center gap-2 text-sm text-primary font-medium">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" /> {c}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── VALUE SECTION ─── */}
        <section className="py-14">
          <div className="max-w-2xl mx-auto px-5">
            <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-8">
              La solution: des rendez-vous qualifiés, pas des clics
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Brain, title: "Score AIPP", desc: "Mesurez votre visibilité IA" },
                { icon: Shield, title: "Profil intelligent", desc: "Optimisé pour les recommandations" },
                { icon: MessageCircle, title: "Alex vous guide", desc: "Votre stratégie personnalisée" },
                { icon: Calendar, title: "Rendez-vous", desc: "Exclusifs et qualifiés" },
              ].map((v) => (
                <Card key={v.title} className="border-primary/10">
                  <CardContent className="p-4 text-center space-y-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                      <v.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">{v.title}</h3>
                    <p className="text-xs text-muted-foreground">{v.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="py-14 bg-muted/30">
          <div className="max-w-2xl mx-auto px-5">
            <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-10">
              Comment ça fonctionne
            </h2>
            <div className="space-y-6">
              {[
                { step: "1", title: "Entrez votre site web", desc: "Juste votre URL ou votre numéro de téléphone. On fait le reste.", icon: Zap },
                { step: "2", title: "Analyse automatique", desc: "On scanne votre présence en ligne et on détecte vos forces et faiblesses.", icon: Brain },
                { step: "3", title: "Recevez votre score", desc: "Score AIPP détaillé avec captures d'écran et recommandations.", icon: Calendar },
              ].map((s) => (
                <div key={s.step} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-lg flex-shrink-0">
                    {s.step}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
                    <p className="text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── AIPP QUICK CHECK ─── */}
        <section ref={formRef} className="py-14">
          <div className="max-w-2xl mx-auto px-5">
            <div className="text-center mb-8">
              <Badge variant="outline" className="mb-3 border-primary/30 text-primary text-xs">
                <Star className="h-3 w-3 mr-1" /> Gratuit • Instantané
              </Badge>
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Découvrez votre score AIPP
              </h2>
              <p className="text-sm text-muted-foreground">
                Un seul champ suffit. Site web ou téléphone.
              </p>
            </div>

            <div ref={scoreRef}>
              {phase === "form" && (
                <AippQuickCheckForm onSubmit={handleFormSubmit} isLoading={isScanning} />
              )}
              {phase === "loading" && (
                <AippLoadingSequence onComplete={handleLoadingComplete} />
              )}
              {phase === "result" && result && (
                <AippQuickResultCard
                  result={result}
                  businessName={businessName}
                  city={businessCity}
                  onCreateProfile={() => {
                    trackEvent("cta_create_profile", "ad_landing", { score: result.score });
                    navigate("/contractor-onboarding");
                  }}
                  onTalkToAlex={() => {
                    trackEvent("cta_talk_alex", "ad_landing", { score: result.score });
                    navigate("/alex");
                  }}
                />
              )}
            </div>
          </div>
        </section>

        {/* ─── ALEX INTRO PREVIEW ─── */}
        <section className="py-14 bg-muted/30">
          <div className="max-w-md mx-auto px-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-7 w-7 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">
              Alex peut vous guider
            </h2>
            <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
              Alex peut vous guider pour compléter votre profil et vous montrer exactement quoi faire ensuite pour recevoir vos premiers rendez-vous qualifiés.
            </p>
            <Button variant="outline" size="lg" onClick={() => {
              trackEvent("cta_alex_preview", "ad_landing");
              navigate("/alex");
            }}>
              Parler à Alex <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>

        {/* ─── STICKY BOTTOM CTA (mobile) ─── */}
        {phase !== "result" && (
          <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-md border-t border-border p-3 safe-area-bottom">
            <Button size="lg" className="w-full h-12 text-base font-bold" onClick={scrollToForm}>
              Voir mon score gratuit <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
