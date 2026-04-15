import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

export default function PageContractorPublicMagicAccess() {
  const { magicToken } = useParams<{ magicToken: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!magicToken) return;
    (async () => {
      const { data } = await supabase
        .from("contractor_recruitment_offers")
        .select("magic_token")
        .eq("magic_token", magicToken)
        .maybeSingle();
      if (data) {
        navigate(`/join/${magicToken}`, { replace: true });
      } else {
        setError("Lien invalide ou expiré");
      }
    })();
  }, [magicToken, navigate]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">{error}</p>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Skeleton className="h-8 w-48 rounded" />
    </div>
  );
}
