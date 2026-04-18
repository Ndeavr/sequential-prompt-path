/**
 * UNPRO — /pricing legacy entry
 * Redirects to dedicated homeowner or contractor pricing page based on
 * the legacy `?tab=` query param. Preserves any other params (e.g. `?plan=`).
 */
import { Navigate, useSearchParams } from "react-router-dom";

export default function PricingPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");

  // Build forwarded query (everything except `tab`)
  const forwarded = new URLSearchParams(searchParams);
  forwarded.delete("tab");
  const qs = forwarded.toString();
  const suffix = qs ? `?${qs}` : "";

  const target =
    tab === "entrepreneurs"
      ? `/pricing/entrepreneurs${suffix}`
      : `/pricing/proprietaires${suffix}`;

  return <Navigate to={target} replace />;
}
