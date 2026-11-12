/**
 * Public Clara entry metadata. `/conversation` is canonical; legacy `/alex*`
 * aliases keep working (deep links, ?q=) but point their canonical here so
 * they are never indexed as a separate assistant identity.
 */
import SeoHead from "@/seo/components/SeoHead";
import { CLARA_PUBLIC_PATH } from "@/seo/sitemapSources";

export const CLARA_CANONICAL_URL = `https://unpro.ca${CLARA_PUBLIC_PATH}`;

export default function ClaraEntrySeoHead() {
  return (
    <SeoHead
      title="Clara — conseillère IA UNPRO pour votre maison"
      description="Décrivez votre projet ou votre problème à Clara : elle clarifie la situation, une question à la fois, et vous oriente vers le professionnel le plus compatible."
      canonical={CLARA_CANONICAL_URL}
      includeAlternates={false}
    />
  );
}
