/**
 * Live HTTPS runtime compatibility check, no credentials and no UNPRO prospect.
 * Exercises the exact first-party pinned transport against an inert public page.
 * Failure is diagnostic: never weakens SSRF/TLS restrictions or permits sending.
 */
import { pinnedPublicFetch } from "../../supabase/functions/enrich-official-website/pinnedPublicFetch.ts";

const response = await pinnedPublicFetch("https://example.com/");
if (response.status !== 200) throw new Error(`pinned_fetch_http_${response.status}`);
const text = await response.text();
if (!text.toLowerCase().includes("example domain")) throw new Error("pinned_fetch_body_unexpected");
console.log("Deno pinned HTTPS smoke: public IP pinning + SNI/TLS verified; HTTP 200; no credentials.");

// Verify the same certificate/SNI mismatch observed on the Hostinger-hosted Clean Vents site.
await import("./deno-tls-sni-probe.ts");


// Exercise the actual Edge transport against the Hostinger-backed Clean Vents
// site where the previous direct-IP HTTPS implementation failed certificate
// validation. This is GET-only; no CASL capture, database, SMS or payment.
const hosted = await pinnedPublicFetch("https://cleanvents.ca/robots.txt");
if (hosted.status < 200 || hosted.status >= 500) throw new Error("cleanvents_tls_transport_status_" + hosted.status);
console.log(JSON.stringify({result:"cleanvents_pinned_https_pass",status:hosted.status}));

// Business-source verification smoke: REAL site content, zero database writes,
// zero CASL approvals and no SMS. This exercises the same observation logic as
// the admin dry-run without impersonating an administrator.
const { observeFirstParty } = await import("../../supabase/functions/enrich-official-website/caslFirstParty.ts");
const observation = await observeFirstParty(
  {
    id: "public-diagnostic",
    destination_type: "phone_sms",
    destination_normalized: "+14502347403",
    source_type: "company_website",
    source_url: "https://cleanvents.ca/",
    business_relevance_explanation: "Public diagnostic of duct-cleaning business contact information only; no consent inferred.",
  },
  { business_name: "Clean Vents", website_url: "https://cleanvents.ca/", category_slug: "nettoyage-conduits" },
  { fetch: pinnedPublicFetch, resolve: (host: string) => Deno.resolveDns(host, "A") },
);
if (observation.status !== "machine_verified" || observation.reason !== "publication_observed_human_review_required")
  throw new Error("cleanvents_real_observation_failed_" + observation.reason);
if (observation.legal_consent_established !== false || observation.pages.length < 1)
  throw new Error("cleanvents_observation_safety_failed");
console.log(JSON.stringify({
  result: "cleanvents_first_party_observation_pass",
  status: observation.status,
  reason: observation.reason,
  human_approval: false,
  sms_sent: 0,
  first_party_pages: observation.pages.length,
}));
