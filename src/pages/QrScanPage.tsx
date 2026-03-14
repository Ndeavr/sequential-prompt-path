/**
 * UNPRO — QR Scan Landing Page
 * Routes scans to owner flow, contractor contribution, or public jobsite page.
 */

import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { resolveQrToken, logQrScan, type QrResolution } from "@/services/qr";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QrCode, Camera, ShieldCheck, Wrench, Home, ArrowRight,
  MapPin, AlertCircle, Sparkles, User, Building,
} from "lucide-react";
import { motion } from "framer-motion";
import ContributionForm from "@/components/qr/ContributionForm";
import ElectricalPanelFlow from "@/components/qr/ElectricalPanelFlow";

export default function QrScanPage() {
  const { token } = useParams<{ token: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [qr, setQr] = useState<QrResolution | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"detect" | "owner" | "contractor" | "public">("detect");

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const result = await resolveQrToken(token);
        setQr(result);

        if (result.valid && result.qr_id) {
          await logQrScan({
            qr_code_id: result.qr_id,
            scanned_by: user?.id,
            scanner_role: isAuthenticated ? (result.owner_id === user?.id ? "owner" : "visitor") : "anonymous",
            scan_context: result.qr_type,
          });
        }

        // Auto-detect mode
        if (!result.valid) {
          setMode("public");
        } else if (result.qr_type === "jobsite_temporary") {
          setMode("public");
        } else if (isAuthenticated && result.owner_id === user?.id) {
          setMode("owner");
        } else if (isAuthenticated) {
          setMode("contractor");
        } else {
          setMode("public");
        }
      } catch {
        setQr({ valid: false, reason: "error" });
        setMode("public");
      } finally {
        setLoading(false);
      }
    })();
  }, [token, user?.id, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen premium-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!qr?.valid) {
    return <InvalidQrPage />;
  }

  // Electrical panel flow for owner
  if (qr.qr_type === "electrical_panel" && mode === "owner") {
    return <ElectricalPanelFlow propertyId={qr.property_id!} qrId={qr.qr_id!} />;
  }

  // Jobsite temporary QR - public page
  if (qr.qr_type === "jobsite_temporary") {
    return (
      <JobsitePublicPage
        projectType={qr.project_type}
        city={qr.city}
        status={qr.status}
        contractorId={qr.contractor_id}
      />
    );
  }

  // Owner property plate flow
  if (mode === "owner") {
    return (
      <OwnerDeepLink propertyId={qr.property_id!} qrType={qr.qr_type!} />
    );
  }

  // Contractor contribution flow
  if (mode === "contractor") {
    return (
      <ContributionForm
        propertyId={qr.property_id!}
        qrCodeId={qr.qr_id!}
        userId={user!.id}
      />
    );
  }

  // Public fallback
  return <PublicPropertyPrompt />;
}

// ─── Sub-components ───

function InvalidQrPage() {
  return (
    <div className="min-h-screen premium-bg flex items-center justify-center p-4">
      <Card className="glass-card border-0 max-w-sm w-full">
        <CardContent className="p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Code QR invalide</h2>
          <p className="text-sm text-muted-foreground">
            Ce code QR est expiré ou n'existe pas.
          </p>
          <Button asChild className="w-full rounded-xl">
            <Link to="/">Découvrir UNPRO</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function OwnerDeepLink({ propertyId, qrType }: { propertyId: string; qrType: string }) {
  return (
    <div className="min-h-screen premium-bg flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="glass-card border-0 max-w-sm w-full">
          <CardContent className="p-6 space-y-5">
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Home className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Votre propriété</h2>
              <p className="text-sm text-muted-foreground">
                Accédez à votre Passeport Maison pour enrichir votre profil immobilier.
              </p>
            </div>

            <div className="space-y-2">
              <Button asChild className="w-full rounded-xl gap-2">
                <Link to={`/dashboard/properties/${propertyId}/passport`}>
                  <QrCode className="h-4 w-4" /> Ouvrir le Passeport Maison
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl gap-2">
                <Link to={`/dashboard/properties/${propertyId}`}>
                  Voir la propriété <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

function JobsitePublicPage({
  projectType, city, status, contractorId,
}: { projectType?: string; city?: string; status?: string; contractorId?: string }) {
  return (
    <div className="min-h-screen premium-bg">
      <div className="max-w-md mx-auto px-5 py-8 space-y-5">
        {/* Header */}
        <div className="text-center space-y-3">
          <Badge variant="outline" className="text-xs border-primary/20 text-primary">
            <Wrench className="h-3 w-3 mr-1" /> Chantier actif
          </Badge>
          <h1 className="text-xl font-bold text-foreground">Travaux en cours</h1>
        </div>

        {/* Project info — privacy-safe */}
        <Card className="glass-card border-0">
          <CardContent className="p-5 space-y-3">
            {projectType && (
              <div className="flex items-center gap-3">
                <Wrench className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Type de projet</p>
                  <p className="text-sm font-semibold text-foreground">{projectType}</p>
                </div>
              </div>
            )}
            {city && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Secteur</p>
                  <p className="text-sm font-semibold text-foreground">{city}</p>
                </div>
              </div>
            )}
            {status && (
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-success shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Statut</p>
                  <Badge variant="secondary" className="text-[10px] bg-success/10 text-success">
                    {status === "active" ? "En cours" : status}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contractor link */}
        {contractorId && (
          <Button asChild variant="outline" className="w-full rounded-xl gap-2">
            <Link to={`/contractors/${contractorId}`}>
              <Building className="h-4 w-4" /> Voir l'entrepreneur
            </Link>
          </Button>
        )}

        {/* CTAs */}
        <div className="space-y-2">
          <Button asChild className="w-full rounded-xl gap-2">
            <Link to="/describe-project">
              <Sparkles className="h-4 w-4" /> Demander des travaux similaires
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full rounded-xl gap-2">
            <Link to="/homeowners">
              <Home className="h-4 w-4" /> Créer mon Passeport Maison
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full rounded-xl gap-2 text-muted-foreground">
            <Link to="/">
              Découvrir UNPRO <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>

        {/* Privacy note */}
        <p className="text-[10px] text-muted-foreground text-center">
          Aucune information personnelle n'est divulguée. Seuls le type de projet et le secteur sont visibles.
        </p>
      </div>
    </div>
  );
}

function PublicPropertyPrompt() {
  return (
    <div className="min-h-screen premium-bg flex items-center justify-center p-4">
      <Card className="glass-card border-0 max-w-sm w-full">
        <CardContent className="p-6 text-center space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <QrCode className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Propriété UNPRO</h2>
          <p className="text-sm text-muted-foreground">
            Connectez-vous pour accéder à cette propriété ou soumettre une contribution en tant qu'entrepreneur.
          </p>
          <div className="space-y-2">
            <Button asChild className="w-full rounded-xl">
              <Link to="/login">Se connecter</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-xl">
              <Link to="/signup">Créer un compte</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
