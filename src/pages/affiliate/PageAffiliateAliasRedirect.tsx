/**
 * PageAffiliateAliasRedirect — alias /a/:slug -> route canonique /:affiliateSlug.
 *
 * L'alias historique lisait la table `affiliates` en direct (bloquée pour les
 * visiteurs anonymes), ce qui affichait « Affilié introuvable » alors que le
 * lien canonique fonctionnait. On redirige donc vers la route canonique, seule
 * source de vérité (RPC `affiliate_entry_by_slug`), en conservant les
 * paramètres de suivi. Un slug inconnu reste « introuvable » côté canonique.
 */
import { Navigate, useLocation, useParams } from "react-router-dom";

export default function PageAffiliateAliasRedirect() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();

  if (!slug) return <Navigate to="/affilies" replace />;

  const target = `/${slug.toLowerCase()}${location.search}${location.hash}`;
  return <Navigate to={target} replace />;
}
