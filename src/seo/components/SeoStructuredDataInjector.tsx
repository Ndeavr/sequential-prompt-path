/**
 * UNPRO — SeoStructuredDataInjector
 * Auto-injects JSON-LD structured data based on current route.
 * Used in MainLayout.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { websiteSchema, organizationSchema, injectJsonLd } from "@/lib/seoSchema";

export default function SeoStructuredDataInjector() {
  const { pathname } = useLocation();

  useEffect(() => {
    const cleanups: (() => void)[] = [];

    // Homepage: WebSite + Organization
    if (pathname === "/" || pathname === "/index") {
      cleanups.push(injectJsonLd(websiteSchema()));
      cleanups.push(injectJsonLd(organizationSchema()));
    }

    return () => cleanups.forEach(fn => fn());
  }, [pathname]);

  return null;
}
