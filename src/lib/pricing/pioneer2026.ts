/** Owner-approved terms; pure model shared with the staged canonical checkout patch. */
export const PIONEER_2026 = {
  code: 'pioneer_2026',
  firstYearCents: 35000,
  monthlyCents: 5000,
  annualCents: 50000,
  months: 12,
  capacity: 1000,
  reservedFirstNumber: 1,
  closesAt: '2027-01-01T05:00:00.000Z', // exclusive; Toronto Dec 31 inclusive
  timeZone: 'America/Toronto',
  automaticRenewal: false,
} as const;

export function pioneerDateOpen(at: Date): boolean {
  return Number.isFinite(at.getTime()) && at.getTime() < Date.parse(PIONEER_2026.closesAt);
}
export function pioneerSavings() {
  return { monthly: PIONEER_2026.monthlyCents * 12 - PIONEER_2026.firstYearCents,
    annual: PIONEER_2026.annualCents - PIONEER_2026.firstYearCents };
}
export function pioneerNumber(n: number): string | null {
  return Number.isInteger(n) && n >= 1 && n <= PIONEER_2026.capacity ? String(n).padStart(4, '0') : null;
}
export const PIONEER_COPY = {
  fr: {
    name: 'UNPRO Rénovation – Construction · Pionnier 2026',
    price: '350 $ + taxes · première année',
    regular: 'Tarifs réguliers : 50 $/mois (600 $ sur 12 mois) ou 500 $/an, payé d’avance.',
    savings: 'Économisez 250 $ par rapport au paiement mensuel ou 150 $ par rapport au paiement annuel.',
    scope: 'Votre profil professionnel + 12 mois de Présence IA sur UNPRO. Rendez-vous selon une entente distincte, avec prix et quantité divulgués avant paiement; aucun inclus par défaut.',
    limit: 'Pour les 1 000 premiers professionnels admissibles, jusqu’au 31 décembre 2026 inclus, heure de Toronto.',
    renewal: 'Renouvellement annuel : 500 $ + taxes, avec votre consentement explicite. Aucun nouvel abonnement automatique sans votre accord.',
    pending: 'L’admissibilité et les places Pionnier ne sont pas encore confirmées. L’activation Présence IA existante reste distincte.',
    unavailable: 'Offre Pionnier fermée ou complète. Aucun autre prix ne sera facturé sans votre accord.',
    remaining: 'places Pionnier disponibles',
    next: 'Prochain numéro',
    reserved: '0001 réservé; aucune vente présumée.',
    action: 'Préparer mon profil avec Clara',
  },
  en: {
    name: 'UNPRO Renovation – Construction · Pioneer 2026',
    price: '$350 + tax · first year',
    regular: 'Regular rates: $50/month ($600 over 12 months) or $500/year, paid upfront.',
    savings: 'Save $250 compared with monthly payments or $150 compared with annual payment.',
    scope: 'Your professional profile + 12 months of AI Presence on UNPRO. Appointments require a separate agreement with price and quantity disclosed before payment; none included by default.',
    limit: 'For the first 1,000 eligible professionals, through December 31, 2026 inclusive, Toronto time.',
    renewal: 'Annual renewal: $500 + tax, with your explicit consent. No new automatic subscription without your agreement.',
    pending: 'Pioneer eligibility and availability are not yet confirmed. Existing AI Presence activation remains separate.',
    unavailable: 'Pioneer offer closed or full. No different price will be charged without your agreement.',
    remaining: 'Pioneer places available',
    next: 'Next number',
    reserved: '0001 reserved; no sale presumed.',
    action: 'Prepare my profile with Clara',
  },
} as const;