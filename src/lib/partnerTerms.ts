export const PARTNER_TERMS_VERSION = "2026.05.v1";

export type PartnerRole = "affiliate" | "ambassador" | "certified_partner" | "territory_partner" | "partner_admin";

export const PARTNER_ROLE_LABEL: Record<PartnerRole, string> = {
  affiliate: "Affilié",
  ambassador: "Ambassadeur",
  certified_partner: "Partenaire Certifié",
  territory_partner: "Partenaire de territoire",
  partner_admin: "Admin partenaire",
};

export const PARTNER_TERMS: Record<PartnerRole, string[]> = {
  affiliate: [
    "Aucun spam, aucune publicité trompeuse.",
    "Aucun faux lead, aucune promesse non autorisée.",
    "Les commissions sont sujettes à validation par UNPRO.",
    "Respect des lois canadiennes anti-pourriel (LCAP) et québécoises.",
  ],
  ambassador: [
    "Aucun spam, aucune publicité trompeuse, aucun faux lead.",
    "Le CRM est strictement réservé à un usage professionnel.",
    "Obtenir la permission explicite du client avant tout courriel ou SMS.",
    "Respect strict de la LCAP et de la Loi 25 (Québec).",
    "Interdiction de revente, de partage ou d'extraction massive des listes.",
    "Toutes les activités sont enregistrées et auditées.",
  ],
  certified_partner: [
    "Toutes les conditions Ambassadeur s'appliquent.",
    "Standards qualité et minimum d'activité annuel à respecter.",
    "Protection de l'image et de la marque UNPRO en tout temps.",
    "Respect des exclusivités de territoire attribuées.",
    "Confidentialité stricte des données entrepreneurs et clients.",
    "Conformité légale et fiscale du partenaire.",
  ],
  territory_partner: [
    "Toutes les conditions Partenaire Certifié s'appliquent.",
    "Engagement de couverture territoriale et SLA de réponse.",
  ],
  partner_admin: [
    "Accès interne UNPRO uniquement.",
  ],
};
