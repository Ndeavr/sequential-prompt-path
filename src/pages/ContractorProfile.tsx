/**
 * UNPRO — Public Contractor Profile Page
 */

import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  MapPin,
  Star,
  ShieldCheck,
  TrendingUp,
  Clock,
  FileText,
  CalendarPlus,
} from "lucide-react";
import {
  usePublicContractorProfile,
  usePublicContractorReviews,
} from "@/hooks/usePublicContractors";
import { useAuth } from "@/hooks/useAuth";

const ContractorProfile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: contractor, isLoading, isError } = usePublicContractorProfile(id);
  const { data: reviews } = usePublicContractorReviews(id);
  const { user, role } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Chargement…</p>
      </div>
    );
  }

  if (isError || !contractor) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-lg font-medium text-foreground">Entrepreneur introuvable</p>
        <p className="text-sm text-muted-foreground">
          Ce profil n'existe pas ou n'est pas encore vérifié.
        </p>
        <Button asChild variant="outline">
          <Link to="/search">Retour à la recherche</Link>
        </Button>
      </div>
    );
  }

  const isVerified = contractor.verification_status === "verified";
  const isHomeowner = !!user && role === "homeowner";
  const isAuthenticated = !!user;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-2">
          <Button asChild variant="ghost" size="icon">
            <Link to="/search"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <span className="text-sm text-muted-foreground">Retour à la recherche</span>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {/* Identity block */}
        <div className="flex gap-4 items-start">
          <div className="h-16 w-16 shrink-0 rounded-xl bg-muted flex items-center justify-center overflow-hidden">
            {contractor.logo_url ? (
              <img src={contractor.logo_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">
                {contractor.business_name.charAt(0)}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-foreground">{contractor.business_name}</h1>
              {isVerified && (
                <Badge variant="secondary" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> Vérifié
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              {contractor.specialty && <span>{contractor.specialty}</span>}
              {contractor.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {contractor.city}{contractor.province ? `, ${contractor.province}` : ""}
                </span>
              )}
              {contractor.years_experience != null && contractor.years_experience > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {contractor.years_experience} ans d'expérience
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="flex flex-wrap gap-4">
          {contractor.aipp_score != null && contractor.aipp_score > 0 && (
            <Card className="flex-1 min-w-[140px]">
              <CardContent className="p-4 flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{contractor.aipp_score}</p>
                  <p className="text-xs text-muted-foreground">Score AIPP</p>
                </div>
              </CardContent>
            </Card>
          )}
          {contractor.rating != null && contractor.rating > 0 && (
            <Card className="flex-1 min-w-[140px]">
              <CardContent className="p-4 flex items-center gap-3">
                <Star className="h-5 w-5 fill-current text-primary" />
                <div>
                  <p className="text-2xl font-bold text-foreground">{contractor.rating.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">
                    {contractor.review_count ?? 0} avis
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Description */}
        {contractor.description && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">À propos</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {contractor.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Reviews */}
        {reviews && reviews.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Avis ({reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.map((review, i) => (
                <div key={review.id}>
                  {i > 0 && <Separator className="mb-4" />}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, si) => (
                          <Star
                            key={si}
                            className={`h-3 w-3 ${si < review.rating ? "fill-current text-primary" : "text-muted"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("fr-CA")}
                      </span>
                    </div>
                    {review.title && (
                      <p className="text-sm font-medium text-foreground">{review.title}</p>
                    )}
                    {review.content && (
                      <p className="text-sm text-muted-foreground">{review.content}</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            {isHomeowner ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Intéressé par cet entrepreneur?
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to={`/dashboard/book/${id}`}>
                      <CalendarPlus className="h-4 w-4 mr-1" /> Demander un rendez-vous
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/dashboard/quotes/upload">Téléverser une soumission</Link>
                  </Button>
                </div>
              </>
            ) : isAuthenticated ? (
              <p className="text-sm text-muted-foreground">
                La prise de rendez-vous est réservée aux propriétaires.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Vous souhaitez contacter cet entrepreneur ou demander un rendez-vous?
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to={`/signup?redirect=/contractors/${id}`}>Créer un compte</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/login?redirect=/contractors/${id}`}>Se connecter</Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ContractorProfile;
