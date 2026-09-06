import { useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, Expand, Loader2, Pencil } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import ContractorPublicExperience from "@/features/contractorProfile/public/ContractorPublicExperience";
import { useContractorProfile } from "@/hooks/useContractor";
import { useContractorFullProfile } from "@/hooks/useContractorPublicPage";

export default function PageProPublicProfile() {
  const { contractorId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: ownedProfile, isLoading: ownerLoading } = useContractorProfile();
  const isOwner = !!ownedProfile?.id && ownedProfile.id === contractorId;
  const { data, isLoading } = useContractorFullProfile(isOwner ? contractorId : undefined);
  const saved = (location.state as { saved?: boolean } | null)?.saved === true;

  if (ownerLoading || isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  if (!isOwner || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div><h1 className="text-xl font-bold">Aperçu indisponible</h1><p className="mt-2 text-sm text-muted-foreground">Connectez-vous au compte propriétaire de ce profil pour le prévisualiser.</p></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_10%,hsl(var(--primary)/0.18),transparent_35%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.3))] px-3 py-7 sm:px-6 lg:py-12">
      <Helmet><title>Aperçu du profil — {ownedProfile.business_name}</title></Helmet>
      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Aperçu privé</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Voici votre profil public</h1>
            <p className="mt-1 text-sm text-muted-foreground">Il s’affiche ici exactement comme pour les propriétaires.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Modifier le profil" title="Modifier" onClick={() => navigate("/pro/profile")}><Pencil className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" aria-label="Voir le profil en plein écran" title="Plein écran" onClick={() => navigate(`/contractors/${contractorId}`)}><Expand className="h-4 w-4" /></Button>
          </div>
        </div>

        {saved && (
          <div role="status" className="mx-auto mb-5 flex w-fit items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm font-semibold text-success shadow-lg">
            <CheckCircle2 className="h-4 w-4" />Modifications enregistrées
          </div>
        )}

        <div className="relative mx-auto w-full max-w-[430px] lg:rotate-[3deg] lg:transition-transform lg:duration-500 lg:hover:rotate-0">
          <div className="absolute -inset-8 -z-10 rounded-[4rem] bg-primary/15 blur-3xl" />
          <div className="rounded-[2.8rem] border-[9px] border-[#182031] bg-[#182031] p-1.5 shadow-[0_45px_90px_-30px_rgba(0,0,0,0.8),0_12px_35px_-15px_hsl(var(--primary)/0.45)]">
            <div className="mx-auto mb-1 h-5 w-24 rounded-full bg-[#070b13]" aria-hidden="true" />
            <div className="h-[73vh] min-h-[620px] overflow-y-auto rounded-[2rem] bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ContractorPublicExperience profileData={data} compact />
            </div>
            <div className="mx-auto my-2 h-1 w-24 rounded-full bg-white/25" aria-hidden="true" />
          </div>
        </div>
      </div>
    </main>
  );
}