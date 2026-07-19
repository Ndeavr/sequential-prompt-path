/**
 * PageAffiliateShortLink — Route /go/:slug
 * Redirige vers /affiliate/login prérempli avec le slug.
 * Si l'utilisateur est déjà connecté et est cet affilié → /affiliate.
 */
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function PageAffiliateShortLink() {
  const { slug } = useParams<{ slug: string }>();
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      if (!slug) return nav("/affiliate/login", { replace: true });
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (uid) {
        const { data } = await supabase
          .from("affiliates" as any)
          .select("id, user_id, slug")
          .eq("slug", slug.toLowerCase())
          .maybeSingle();
        const a = data as any;
        if (a?.user_id === uid) return nav("/affiliate", { replace: true });
      }
      nav(`/affiliate/login?slug=${encodeURIComponent(slug)}`, { replace: true });
    })();
  }, [slug, nav]);

  return null;
}
