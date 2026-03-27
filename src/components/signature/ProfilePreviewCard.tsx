/**
 * ProfilePreviewCard — Preview of the contractor profile before publishing.
 * Shows real imported data when available.
 */
import { motion } from "framer-motion";
import { MapPin, Phone, Mail, Globe, Star, Crown, Loader2, ExternalLink, Shield, Clock, Check } from "lucide-react";
import type { ImportedBusinessData } from "@/pages/signature/PageAlexGuidedOnboarding";

interface Props {
  draft: {
    business_name: string;
    first_name: string;
    city: string;
    phone: string;
    email: string;
    activity: string;
    website?: string;
  };
  categories: { primary: string; secondary: string[] };
  territories: string[];
  importedData?: ImportedBusinessData | null;
  onPublish: () => void;
  isProcessing: boolean;
}

export default function ProfilePreviewCard({ draft, categories, territories, importedData, onPublish, isProcessing }: Props) {
  const rating = importedData?.rating?.value;
  const reviewCount = importedData?.reviewCount?.value;
  const address = importedData?.address?.value;
  const hours = importedData?.businessHours?.value;
  const hasInsurance = !!importedData?.insuranceInfo?.value;
  const hasLicense = !!importedData?.licenseNumber?.value;
  const photoCount = importedData?.photoCount?.value || 0;
  const website = draft.website || importedData?.website?.value;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground text-center">Prévisualisation</h2>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border/40 bg-card overflow-hidden shadow-lg"
      >
        {/* Header gradient */}
        <div className="h-20 bg-gradient-to-r from-primary to-secondary relative">
          <div className="absolute -bottom-6 left-5">
            <div className="w-14 h-14 rounded-2xl bg-card border-4 border-card flex items-center justify-center text-2xl font-bold text-primary shadow-md">
              {draft.business_name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-[10px] font-bold">
              <Crown className="w-3 h-3" /> Signature
            </div>
          </div>
        </div>

        <div className="pt-10 p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-foreground">{draft.business_name}</h3>
            <p className="text-xs text-muted-foreground">{draft.activity}</p>
          </div>

          {/* Rating */}
          {rating && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="text-sm font-semibold text-foreground">{rating}</span>
              {reviewCount && (
                <span className="text-xs text-muted-foreground">({reviewCount} avis)</span>
              )}
            </div>
          )}

          {/* Quick info */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 flex-shrink-0" /> {address || draft.city}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 flex-shrink-0" /> {draft.phone}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 flex-shrink-0" /> {draft.email}
            </div>
            {website && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="w-3 h-3 flex-shrink-0" /> Site web
              </div>
            )}
          </div>

          {/* Hours */}
          {hours && (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{hours}</span>
            </div>
          )}

          {/* Category */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Catégorie</p>
            <div className="flex flex-wrap gap-1.5">
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">
                {categories.primary}
              </span>
              {categories.secondary.slice(0, 3).map((s) => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-muted/30 text-muted-foreground text-xs">
                  {s}
                </span>
              ))}
              {categories.secondary.length > 3 && (
                <span className="px-2 py-1 text-xs text-muted-foreground">
                  +{categories.secondary.length - 3}
                </span>
              )}
            </div>
          </div>

          {/* Territories */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Territoires</p>
            <p className="text-xs text-foreground">{territories.join(", ")}</p>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap gap-2">
            {hasLicense && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-600 text-[10px] font-medium">
                <Shield className="w-3 h-3" /> Licencié
              </div>
            )}
            {hasInsurance && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-green-500/10 text-green-600 text-[10px] font-medium">
                <Check className="w-3 h-3" /> Assuré
              </div>
            )}
            {photoCount > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-500/10 text-blue-600 text-[10px] font-medium">
                {photoCount} photos
              </div>
            )}
          </div>

          {/* AIPP Score */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/10 border border-border/20">
            <Star className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-[10px] text-muted-foreground">Score AIPP estimé</p>
              <p className="text-sm font-bold text-foreground">
                {rating ? `${Math.min(Math.round(rating * 15 + (reviewCount ? Math.min(reviewCount, 50) * 0.4 : 0)), 95)}/100` : "En cours de calcul..."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Publish CTA */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        disabled={isProcessing}
        onClick={onPublish}
        className="w-full h-14 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <ExternalLink className="w-5 h-5" />
            Publier mon profil
          </>
        )}
      </motion.button>

      <p className="text-center text-[10px] text-muted-foreground">
        Vous pourrez modifier votre profil à tout moment depuis votre cockpit.
      </p>
    </div>
  );
}
