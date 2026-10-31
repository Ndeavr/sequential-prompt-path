/**
 * Sales copy for the demand-first landing. Never imply a current appointment
 * or guaranteed booking from the absence of a confirmed demand signal.
 */
export function buildDemandLandingCopy(
  city: string,
  category: string,
  homeownerCount: number | null | undefined,
) {
  const count = typeof homeownerCount === "number" && Number.isFinite(homeownerCount) && homeownerCount > 0
    ? Math.floor(homeownerCount)
    : 0;
  const area = city.trim() || "votre secteur";
  const service = category.replace(/[-_]+/g, " ").trim() || "votre spécialité";
  const plural = count === 1 ? "" : "s";

  return {
    count,
    hasRecordedDemand: count > 0,
    badge: count > 0 ? "Demandes enregistrées" : "Développez votre entreprise",
    title: count > 0
      ? `${count} demande${plural} de propriétaires enregistrée${plural} pour ${service} à ${area}.`
      : `Développez votre clientèle en ${service} à ${area}.`,
    description:
      "Choisissez vos services, vos territoires et les types de projets recherchés. " +
      "Après qualification, l'activation UNPRO à 350 $ + taxes applicables comprend " +
      "votre profil et 12 mois de présence IA UNPRO. " +
      "Les possibilités de rendez-vous dépendent des demandes et de leur compatibilité.",
  };
}
