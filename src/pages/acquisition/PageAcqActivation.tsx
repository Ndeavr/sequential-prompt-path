import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PageAcqActivation() {
  const { slug } = useParams();
  const [contractor, setContractor] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("acq_contractors").select("*").eq("slug", slug).maybeSingle();
      setContractor(c);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;
  const query = contractor?.company_name ? `?q=${encodeURIComponent(contractor.company_name)}` : "";
  return <Navigate to={`/entrepreneurs/audit-ia${query}`} replace />;
}
