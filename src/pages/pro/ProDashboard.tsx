import { Link } from "react-router-dom";
import ContractorLayout from "@/layouts/ContractorLayout";
import { StatCard, LoadingState, EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useContractorProfile, useContractorReviews, useContractorDocuments } from "@/hooks/useContractor";
import { User, Star, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ProDashboard = () => {
  const { data: profile, isLoading: pLoading } = useContractorProfile();
  const { data: reviews, isLoading: rLoading } = useContractorReviews();
  const { data: docs, isLoading: dLoading } = useContractorDocuments();

  const isLoading = pLoading || rLoading || dLoading;
  if (isLoading) return <ContractorLayout><LoadingState /></ContractorLayout>;

  const completeness = profile ? [profile.business_name, profile.specialty, profile.description, profile.phone, profile.email, profile.city].filter(Boolean).length : 0;
  const completenessPercent = Math.round((completeness / 6) * 100);

  return (
    <ContractorLayout>
      <PageHeader title="Tableau de bord Pro" description="Gérez votre profil et vos documents" />

      {!profile && (
        <Card className="mb-6 border-destructive/50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Profil incomplet</p>
              <p className="text-sm text-muted-foreground">Complétez votre profil entrepreneur pour être visible.</p>
            </div>
            <Button asChild className="ml-auto"><Link to="/pro/profile">Compléter</Link></Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard title="Profil complété" value={`${completenessPercent}%`} icon={<User className="h-4 w-4" />} />
        <StatCard title="Avis reçus" value={reviews?.length ?? 0} icon={<Star className="h-4 w-4" />} />
        <StatCard title="Documents" value={docs?.length ?? 0} icon={<FileText className="h-4 w-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile summary */}
        {profile && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Mon profil</CardTitle>
              <Button asChild size="sm" variant="outline"><Link to="/pro/profile">Modifier</Link></Button>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{profile.business_name}</p>
              {profile.specialty && <Badge variant="secondary">{profile.specialty}</Badge>}
              <p className="text-sm text-muted-foreground">{[profile.city, profile.province].filter(Boolean).join(", ")}</p>
              <p className="text-sm text-muted-foreground">Vérification : <Badge variant="outline">{profile.verification_status}</Badge></p>
            </CardContent>
          </Card>
        )}

        {/* Recent reviews */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Avis récents</CardTitle>
            <Button asChild size="sm" variant="outline"><Link to="/pro/reviews">Voir tout</Link></Button>
          </CardHeader>
          <CardContent>
            {!reviews?.length ? (
              <EmptyState message="Aucun avis pour le moment." />
            ) : (
              <ul className="space-y-3">
                {reviews.slice(0, 3).map((r) => (
                  <li key={r.id} className="border-b border-border pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{"★".repeat(r.rating)}</span>
                      {r.title && <span className="text-sm">{r.title}</span>}
                    </div>
                    {r.content && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.content}</p>}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </ContractorLayout>
  );
};

export default ProDashboard;
