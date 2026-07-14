/**
 * Screen 4 — Preliminary AIPP Score.
 * Displays real data only. Every sub-score is justified by concrete evidence
 * pulled from `imported_data` / `aipp_score`. Missing signals are shown as
 * "Non détecté automatiquement" in gray — never as a fake number.
 */
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, X, Eye, Shield, Star, Image as ImageIcon, Target, Globe, Cpu, MapPin, Lock, HeadphonesIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useActivationFunnel } from "@/hooks/useActivationFunnel";
import { useHesitationRescue } from "@/hooks/useHesitationRescue";
import StickyMobileCTA from "@/components/ui/StickyMobileCTA";

type SubKey = "visibility"|"trust"|"reviews"|"media"|"conversion"|"aeo"|"service_precision"|"geo_precision";

const ICONS: Record<SubKey, { icon: React.ElementType; label: string; color: string }> = {
  visibility:        { icon: Eye,     label: "Visibilité",              color: "text-blue-400" },
  trust:             { icon: Shield,  label: "Confiance / Conformité",  color: "text-emerald-400" },
  reviews:           { icon: Star,    label: "Réputation",              color: "text-amber-400" },
  media:             { icon: ImageIcon, label: "Contenu visuel",        color: "text-purple-400" },
  conversion:        { icon: Target,  label: "Conversion",              color: "text-rose-400" },
  aeo:               { icon: Cpu,     label: "Structure IA / AEO",      color: "text-cyan-400" },
  service_precision: { icon: Globe,   label: "Précision services",      color: "text-orange-400" },
  geo_precision:     { icon: MapPin,  label: "Précision géographique",  color: "text-teal-400" },
};

interface Factor { label: string; ok: boolean }

function buildFactors(imported: Record<string, any>, subscores: Record<string, any>): Record<SubKey, Factor[]> {
  const rev = imported.google_reviews_count ?? imported.reviews_count;
  const rating = imported.google_rating ?? imported.rating;
  const photos = Array.isArray(imported.photos) ? imported.photos.length : 0;
  const videos = Array.isArray(imported.videos) ? imported.videos.length : 0;
  const zones = Array.isArray(imported.service_zones) ? imported.service_zones.length : 0;
  const cats = Array.isArray(imported.categories) ? imported.categories.length : 0;
  const rbq = !!imported.rbq_number;
  const neq = !!imported.neq_number;
  const logo = !!imported.logo_url;
  const website = !!imported.website || !!imported.website_url;
  const phone = !!imported.phone;
  const schema = !!imported.schema_localbusiness;

  return {
    visibility: [
      { label: website ? "Site web indexé" : "Site web absent", ok: website },
      { label: imported.gmb_place_id ? "Profil Google Business détecté" : "Profil Google Business absent", ok: !!imported.gmb_place_id },
      { label: logo ? "Logo détecté" : "Logo non détecté", ok: logo },
    ],
    trust: [
      { label: rbq ? `RBQ ${imported.rbq_number}` : "Licence RBQ non détectée", ok: rbq },
      { label: neq ? "NEQ vérifié" : "NEQ non détecté", ok: neq },
      { label: phone ? "Téléphone vérifié" : "Téléphone manquant", ok: phone },
    ],
    reviews: [
      { label: typeof rev === "number" ? `${rev} avis Google` : "Aucun avis détecté", ok: typeof rev === "number" && rev > 0 },
      { label: typeof rating === "number" ? `${rating.toFixed(1)} ★ moyenne` : "Note moyenne inconnue", ok: typeof rating === "number" && rating >= 4 },
    ],
    media: [
      { label: `${photos} photos`, ok: photos >= 6 },
      { label: `${videos} vidéos`, ok: videos > 0 },
      { label: logo ? "Logo présent" : "Logo manquant", ok: logo },
    ],
    conversion: [
      { label: phone ? "Téléphone cliquable" : "Téléphone absent", ok: phone },
      { label: website ? "Site web actif" : "Site web absent", ok: website },
      { label: imported.booking_url ? "Prise de rendez-vous détectée" : "Aucune prise de rendez-vous", ok: !!imported.booking_url },
    ],
    aeo: [
      { label: schema ? "Schema LocalBusiness présent" : "Schema LocalBusiness absent", ok: schema },
      { label: cats > 0 ? `${cats} catégories détectées` : "Catégories non détectées", ok: cats > 0 },
      { label: imported.faqs_count ? `${imported.faqs_count} FAQ` : "FAQ non détectées", ok: !!imported.faqs_count },
    ],
    service_precision: [
      { label: cats > 0 ? `${cats} services listés` : "Services non détectés", ok: cats >= 3 },
    ],
    geo_precision: [
      { label: zones > 0 ? `${zones} villes détectées` : "Zones non détectées", ok: zones >= 1 },
    ],
  };
}

export default function ScreenScore() {
  const navigate = useNavigate();
  const { state } = useActivationFunnel();
  useHesitationRescue({ screenKey: "score" });

  const imported = (state.imported_data ?? {}) as Record<string, any>;
  const scoreRaw: any = state.aipp_score || null;
  const confidence: string = scoreRaw?.confidence_level ?? scoreRaw?.confidence ?? "";
  const hasReal = !!scoreRaw && confidence !== "low";
  const overall: number | null = hasReal ? Number(scoreRaw.overall ?? scoreRaw.overall_score ?? null) : null;

  const subscores: Record<string, any> = scoreRaw?.subscores
    ? Array.isArray(scoreRaw.subscores)
      ? Object.fromEntries(scoreRaw.subscores.map((s: any) => [s.key, s]))
      : scoreRaw.subscores
    : {};
  const factors = buildFactors(imported, subscores);

  const handleContinue = () => navigate("/entrepreneur/activer/profil");

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-28 sm:pb-6">
      {/* Score reveal */}
      <motion.div
        className="text-center mb-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="text-sm text-muted-foreground mb-2">Votre score AIPP préliminaire</p>
        {overall !== null ? (
          <>
            <div className="text-7xl font-bold text-foreground inline-block">
              {overall}
              <span className="text-2xl text-muted-foreground font-normal">/100</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {overall < 50 ? "Beaucoup de potentiel à débloquer" : overall < 70 ? "Bon début, quelques optimisations clés" : "Excellent profil"}
            </p>
          </>
        ) : (
          <div className="mx-auto max-w-sm rounded-2xl border border-border/50 bg-card/50 px-5 py-6">
            <Sparkles className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-base font-semibold text-foreground">Analyse partielle</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nous n'avons pas encore assez de signaux vérifiés pour calculer un score fiable.
              Complétez votre profil pour obtenir votre score AIPP réel.
            </p>
          </div>
        )}
      </motion.div>

      {/* Subscores grid — factors-only, no invented numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        {(Object.keys(ICONS) as SubKey[]).map((key, i) => {
          const cfg = ICONS[key];
          const sub = subscores[key];
          const value: number | null = hasReal && sub && typeof sub.score === "number" ? sub.score : null;
          const f = factors[key];
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="rounded-xl border border-border/50 bg-card/50 p-3"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <cfg.icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                  <span className="text-xs text-muted-foreground truncate">{cfg.label}</span>
                </div>
                {value !== null ? (
                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground leading-none">{value}</span>
                    <span className="text-[10px] text-muted-foreground">/100</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Non calculé</span>
                )}
              </div>
              <div className="space-y-1">
                {f.map((fact, j) => (
                  <div key={j} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {fact.ok ? <Check className="w-3 h-3 text-emerald-500 shrink-0" /> : <X className="w-3 h-3 text-muted-foreground/60 shrink-0" />}
                    <span className={fact.ok ? "" : "text-muted-foreground/60"}>{fact.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Trust reinforcement */}
      <motion.div
        className="flex items-center justify-center gap-4 mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Lock className="w-3 h-3" /> Données sécurisées
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Shield className="w-3 h-3" /> Annulez en tout temps
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <HeadphonesIcon className="w-3 h-3" /> Support disponible
        </div>
      </motion.div>

      {/* Desktop CTA */}
      <Button size="lg" className="w-full h-14 text-base font-semibold rounded-xl hidden sm:flex" onClick={handleContinue}>
        Compléter mon profil <ArrowRight className="w-5 h-5 ml-2" />
      </Button>

      <StickyMobileCTA label="Compléter mon profil" onClick={handleContinue} icon={<ArrowRight className="w-5 h-5 mr-2" />} />
    </div>
  );
}
