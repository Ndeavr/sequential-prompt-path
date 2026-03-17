/**
 * UNPRO — Smart Deep Link Landing Page
 * /i/{code} — Resolves deep links to feature experiences.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { resolveDeepLink, saveDeepLinkIntent, FEATURE_META, type ResolvedDeepLink } from "@/services/deepLinks";
import { trackDeepLinkEvent, setActiveDeepLinkId } from "@/services/deepLinkTracking";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Palette, BarChart3, CalendarCheck, Shield, Zap, Bot,
  ArrowRight, AlertCircle, Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";

const ICON_MAP: Record<string, React.ElementType> = {
  Palette, BarChart3, CalendarCheck, Shield, Zap, Bot,
};

export default function DeepLinkPage() {
  const { code } = useParams<{ code: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<ResolvedDeepLink | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const result = await resolveDeepLink(code);
        setResolved(result);

        // Track events
        if (result.valid && result.link) {
          setActiveDeepLinkId(result.link.id);
          trackDeepLinkEvent("qr_scanned", result.link.id, { code, feature: result.link.feature });
          trackDeepLinkEvent("landing_viewed", result.link.id, { feature: result.link.feature });
        }

        // Auto-redirect if no auth needed or already logged in
        if (result.valid && (!result.requiresAuth || isAuthenticated)) {
          navigate(result.targetPath, { replace: true });
          return;
        }
      } catch {
        setResolved({ valid: false, targetPath: "/", requiresAuth: false, reason: "error" });
      } finally {
        setLoading(false);
      }
    })();
  }, [code, isAuthenticated, navigate]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen premium-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4">
          <Skeleton className="h-16 w-16 rounded-2xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!resolved?.valid) {
    return <InvalidDeepLink />;
  }

  // If we're here, auth is required but user is not logged in — show landing
  return <DeepLinkLanding resolved={resolved} />;
}

function DeepLinkLanding({ resolved }: { resolved: ResolvedDeepLink }) {
  const navigate = useNavigate();
  const feature = resolved.link?.feature ?? "design";
  const meta = FEATURE_META[feature] ?? FEATURE_META.design;
  const IconComponent = ICON_MAP[meta.icon] ?? Sparkles;

  const handleCta = () => {
    saveDeepLinkIntent(resolved);
    navigate("/login");
  };

  return (
    <div className="min-h-screen premium-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        <Card className="glass-card border-0 overflow-hidden">
          {/* Preview visual */}
          <div className={`h-32 bg-gradient-to-br ${meta.previewColor} flex items-center justify-center`}>
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="h-16 w-16 rounded-2xl bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-lg"
            >
              <IconComponent className="h-8 w-8 text-primary" />
            </motion.div>
          </div>

          <CardContent className="p-6 space-y-4">
            <div className="text-center space-y-2">
              <h1 className="text-xl font-bold text-foreground">{meta.headline}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {meta.description}
              </p>
              {resolved.link?.sub_feature && (
                <p className="text-xs text-primary font-medium capitalize">
                  {resolved.link.sub_feature.replace(/_/g, " ")}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Button onClick={handleCta} className="w-full rounded-xl gap-2" size="lg">
                Commencer <ArrowRight className="h-4 w-4" />
              </Button>
              <Button asChild variant="ghost" className="w-full rounded-xl text-muted-foreground text-xs">
                <Link to="/">Découvrir UNPRO</Link>
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Gratuit • Aucun engagement • Résultats instantanés
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function InvalidDeepLink() {
  return (
    <div className="min-h-screen premium-bg flex items-center justify-center p-4">
      <Card className="glass-card border-0 max-w-sm w-full">
        <CardContent className="p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Lien invalide</h2>
          <p className="text-sm text-muted-foreground">
            Ce lien n'existe pas ou a expiré.
          </p>
          <Button asChild className="w-full rounded-xl">
            <Link to="/">Découvrir UNPRO</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
