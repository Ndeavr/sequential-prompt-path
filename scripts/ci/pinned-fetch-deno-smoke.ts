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
