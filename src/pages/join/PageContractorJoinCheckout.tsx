import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { buildTokenActivationUrl } from "@/config/contractorFunnel";
import { Skeleton } from "@/components/ui/skeleton";

export default function PageContractorJoinCheckout() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    navigate(token ? buildTokenActivationUrl(token) : "/join", { replace: true });
  }, [navigate, token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Skeleton className="h-96 w-full max-w-lg rounded-2xl" />
    </div>
  );
}
