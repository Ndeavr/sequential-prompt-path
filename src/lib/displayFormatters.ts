/**
 * UNPRO — Global Display Formatters
 * Centralized text formatting for city names, slugs, and display labels.
 */

/**
 * Capitalize a display name properly, preserving accents and hyphens.
 * "saint-jean-sur-richelieu" → "Saint-Jean-Sur-Richelieu"
 * "montréal" → "Montréal"
 * "sainte-agathe-des-monts" → "Sainte-Agathe-Des-Monts"
 */
export function capitalizeDisplayName(name: string): string {
  if (!name) return "";
  return name
    .split(/(-|\s)/)
    .map((part) => {
      if (part === "-" || part === " ") return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("");
}

/**
 * Convert a slug to a formatted display name.
 * "saint-jean-sur-richelieu" → "Saint-Jean-Sur-Richelieu"
 */
export function slugToDisplayName(slug: string): string {
  if (!slug) return "";
  return capitalizeDisplayName(slug);
}

/**
 * Ensure a city name is properly capitalized for display.
 * If it's already capitalized (from data), returns as-is.
 * If it looks like a slug or lowercase, capitalizes it.
 */
export function formatCityName(name: string): string {
  if (!name) return "";
  // If first letter is already uppercase, trust the source data
  if (name.charAt(0) === name.charAt(0).toUpperCase() && name.charAt(0) !== name.charAt(0).toLowerCase()) {
    return name;
  }
  return capitalizeDisplayName(name);
}
