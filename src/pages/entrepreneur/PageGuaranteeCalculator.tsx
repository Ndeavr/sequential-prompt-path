/** Legacy URL retained only to route visitors into the canonical personalized quote flow. */
import { Navigate, useLocation } from "react-router-dom";

export default function PageGuaranteeCalculator() {
  const { search } = useLocation();
  return <Navigate to={`/entrepreneur/devis-personnalise${search}`} replace />;
}
