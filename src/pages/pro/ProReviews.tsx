import ContractorLayout from "@/layouts/ContractorLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/shared";
import { Card, CardContent } from "@/components/ui/card";
import { useContractorReviews } from "@/hooks/useContractor";

const ProReviews = () => {
  const { data: reviews, isLoading } = useContractorReviews();

  return (
    <ContractorLayout>
      <PageHeader title="Avis clients" description="Les avis laissés par vos clients" />
      {isLoading ? <LoadingState /> : !reviews?.length ? (
        <EmptyState message="Aucun avis pour le moment." />
      ) : (
        <div className="space-y-4 max-w-2xl">
          {reviews.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  {r.title && <span className="font-semibold text-sm">{r.title}</span>}
                </div>
                {r.content && <p className="text-sm text-muted-foreground">{r.content}</p>}
                <p className="text-xs text-muted-foreground mt-2">{new Date(r.created_at).toLocaleDateString("fr-CA")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </ContractorLayout>
  );
};

export default ProReviews;
