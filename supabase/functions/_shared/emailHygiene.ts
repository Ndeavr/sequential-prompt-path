/**
 * UNPRO — Hygiène des adresses courriel collectées sur des sources publiques.
 *
 * Aucune invention : on nettoie uniquement ce qui a été réellement extrait
 * (espaces encodés `%20`, préfixes `mailto:`, ponctuation finale) puis on
 * REJETTE tout ce qui n'est pas une adresse plausible ou qui pointe vers une
 * boîte non commerciale / technique.
 */

const ROLE_BLOCKLIST = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply", "postmaster",
  "abuse", "spam", "mailer-daemon", "bounce", "bounces",
]);

/** Domaines qui ne sont jamais une adresse d'entreprise réelle. */
const DOMAIN_BLOCKLIST = [
  "example.com", "example.org", "sentry.io", "wixpress.com", "godaddy.com",
  "squarespace.com", "domainsbyproxy.com", "privacyprotect.org",
];

const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/;

export function sanitizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let v = String(raw);
  try { v = decodeURIComponent(v); } catch { /* keep raw */ }
  v = v.replace(/^mailto:/i, "").replace(/[\s\u00a0]+/g, "").trim().toLowerCase();
  v = v.replace(/^[.,;:<("']+/, "").replace(/[.,;:>)"']+$/, "");
  if (!EMAIL_RE.test(v)) return null;
  const [local, domain] = v.split("@");
  if (!local || !domain) return null;
  if (local.length > 64 || v.length > 254) return null;
  if (ROLE_BLOCKLIST.has(local)) return null;
  if (DOMAIN_BLOCKLIST.some((d) => domain === d || domain.endsWith(`.${d}`))) return null;
  if (/\.(png|jpg|jpeg|gif|webp|svg|css|js)$/.test(domain)) return null;
  return v;
}

/**
 * Cohérence d'identité : une adresse hébergée sur le domaine officiel de
 * l'entreprise est la preuve la plus forte. Une adresse générique (gmail,
 * hotmail…) reste acceptable si elle est publiée sur le site officiel.
 */
export function emailMatchesOfficialDomain(email: string, officialUrl: string | null | undefined): boolean {
  if (!officialUrl) return false;
  try {
    const host = new URL(officialUrl.startsWith("http") ? officialUrl : `https://${officialUrl}`)
      .hostname.replace(/^www\./, "").toLowerCase();
    const domain = email.split("@")[1] ?? "";
    return domain === host || domain.endsWith(`.${host}`) || host.endsWith(`.${domain}`);
  } catch {
    return false;
  }
}
