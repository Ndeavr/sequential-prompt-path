/**
 * UNPRO — Review Theme Taxonomy Seed Data
 */

export const REVIEW_TAXONOMY_SEED = [
  // ─── work_quality family ───
  { theme_code: "work_quality", family_code: "work_quality", label_fr: "Qualité du travail", label_en: "Work Quality", description_fr: "Qualité générale de l'exécution", description_en: "Overall execution quality", default_weight: 1.2, public_visible: true, matching_relevant: true, score_dimensions: ["quality"], negative_variant_of: null },
  { theme_code: "finish_quality", family_code: "work_quality", label_fr: "Qualité des finis", label_en: "Finish Quality", description_fr: "Précision et esthétique des finitions", description_en: "Precision and aesthetics of finishing", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["quality"], negative_variant_of: null },
  { theme_code: "durability", family_code: "work_quality", label_fr: "Durabilité", label_en: "Durability", description_fr: "Longévité du travail réalisé", description_en: "Longevity of completed work", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["quality"], negative_variant_of: null },

  // ─── cleanliness family ───
  { theme_code: "cleanliness", family_code: "cleanliness", label_fr: "Propreté", label_en: "Cleanliness", description_fr: "Propreté générale du chantier", description_en: "Overall jobsite cleanliness", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["environment"], negative_variant_of: null },
  { theme_code: "daily_cleanup", family_code: "cleanliness", label_fr: "Nettoyage quotidien", label_en: "Daily Cleanup", description_fr: "Routine de nettoyage en fin de journée", description_en: "End-of-day cleanup routine", default_weight: 0.9, public_visible: true, matching_relevant: true, score_dimensions: ["environment"], negative_variant_of: null },
  { theme_code: "poor_cleanup", family_code: "cleanliness", label_fr: "Mauvais nettoyage", label_en: "Poor Cleanup", description_fr: "Chantier laissé en désordre", description_en: "Jobsite left in disarray", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["environment"], negative_variant_of: "cleanliness" },

  // ─── communication family ───
  { theme_code: "communication_clarity", family_code: "communication", label_fr: "Clarté de communication", label_en: "Communication Clarity", description_fr: "Explication claire des travaux", description_en: "Clear explanation of work", default_weight: 1.1, public_visible: true, matching_relevant: true, score_dimensions: ["communication"], negative_variant_of: null },
  { theme_code: "responsiveness", family_code: "communication", label_fr: "Réactivité", label_en: "Responsiveness", description_fr: "Rapidité de réponse aux messages", description_en: "Speed of response to messages", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["communication"], negative_variant_of: null },
  { theme_code: "expectation_management", family_code: "communication", label_fr: "Gestion des attentes", label_en: "Expectation Management", description_fr: "Capacité à bien cadrer les attentes", description_en: "Ability to properly set expectations", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["communication", "trust"], negative_variant_of: null },
  { theme_code: "communication_issue", family_code: "communication", label_fr: "Problème de communication", label_en: "Communication Issue", description_fr: "Difficultés de communication signalées", description_en: "Reported communication difficulties", default_weight: 1.1, public_visible: true, matching_relevant: true, score_dimensions: ["communication"], negative_variant_of: "communication_clarity" },

  // ─── schedule family ───
  { theme_code: "deadline_respect", family_code: "schedule", label_fr: "Respect des délais", label_en: "Deadline Respect", description_fr: "Capacité à respecter les échéanciers", description_en: "Ability to meet deadlines", default_weight: 1.1, public_visible: true, matching_relevant: true, score_dimensions: ["reliability"], negative_variant_of: null },
  { theme_code: "no_show", family_code: "schedule", label_fr: "Absence / No-show", label_en: "No-Show", description_fr: "Ne s'est pas présenté comme convenu", description_en: "Did not show up as agreed", default_weight: 1.3, public_visible: true, matching_relevant: true, score_dimensions: ["reliability"], negative_variant_of: "deadline_respect" },

  // ─── budget family ───
  { theme_code: "pricing_clarity", family_code: "budget", label_fr: "Clarté des prix", label_en: "Pricing Clarity", description_fr: "Transparence dans la tarification", description_en: "Transparency in pricing", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["trust", "budget"], negative_variant_of: null },
  { theme_code: "budget_respect", family_code: "budget", label_fr: "Respect du budget", label_en: "Budget Respect", description_fr: "Travaux réalisés dans le budget convenu", description_en: "Work completed within agreed budget", default_weight: 1.1, public_visible: true, matching_relevant: true, score_dimensions: ["trust", "budget"], negative_variant_of: null },
  { theme_code: "hidden_fees", family_code: "budget", label_fr: "Frais cachés", label_en: "Hidden Fees", description_fr: "Frais supplémentaires non annoncés", description_en: "Unannounced additional fees", default_weight: 1.2, public_visible: true, matching_relevant: true, score_dimensions: ["trust", "budget"], negative_variant_of: "pricing_clarity" },
  { theme_code: "unexpected_extras", family_code: "budget", label_fr: "Extras inattendus", label_en: "Unexpected Extras", description_fr: "Travaux additionnels non prévus", description_en: "Unplanned additional work", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["budget"], negative_variant_of: "budget_respect" },

  // ─── professionalism family ───
  { theme_code: "professionalism", family_code: "professionalism", label_fr: "Professionnalisme", label_en: "Professionalism", description_fr: "Attitude professionnelle générale", description_en: "Overall professional attitude", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["trust"], negative_variant_of: null },
  { theme_code: "sales_pressure", family_code: "professionalism", label_fr: "Pression de vente", label_en: "Sales Pressure", description_fr: "Tentatives de vente agressives", description_en: "Aggressive sales attempts", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["trust"], negative_variant_of: "professionalism" },

  // ─── technical_expertise family ───
  { theme_code: "technical_knowledge", family_code: "technical_expertise", label_fr: "Connaissances techniques", label_en: "Technical Knowledge", description_fr: "Maîtrise technique du métier", description_en: "Technical mastery of trade", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["quality", "expertise"], negative_variant_of: null },

  // ─── trust_integrity family ───
  { theme_code: "honesty", family_code: "trust_integrity", label_fr: "Honnêteté", label_en: "Honesty", description_fr: "Transparence et honnêteté perçues", description_en: "Perceived transparency and honesty", default_weight: 1.2, public_visible: true, matching_relevant: true, score_dimensions: ["trust"], negative_variant_of: null },

  // ─── after_sales family ───
  { theme_code: "after_sales_service", family_code: "after_sales", label_fr: "Service après-vente", label_en: "After-Sales Service", description_fr: "Support après la fin des travaux", description_en: "Support after project completion", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["reliability"], negative_variant_of: null },
  { theme_code: "warranty_support", family_code: "after_sales", label_fr: "Support garantie", label_en: "Warranty Support", description_fr: "Respect des engagements de garantie", description_en: "Fulfillment of warranty commitments", default_weight: 1.0, public_visible: true, matching_relevant: true, score_dimensions: ["reliability", "trust"], negative_variant_of: null },
  { theme_code: "poor_follow_up", family_code: "after_sales", label_fr: "Mauvais suivi", label_en: "Poor Follow-Up", description_fr: "Manque de suivi après les travaux", description_en: "Lack of follow-up after work", default_weight: 1.1, public_visible: true, matching_relevant: true, score_dimensions: ["reliability"], negative_variant_of: "after_sales_service" },

  // ─── jobsite_environment family ───
  { theme_code: "family_friendliness", family_code: "jobsite_environment", label_fr: "Adapté aux familles", label_en: "Family Friendliness", description_fr: "Respect de l'environnement familial", description_en: "Respect for family environment", default_weight: 0.9, public_visible: true, matching_relevant: true, score_dimensions: ["environment"], negative_variant_of: null },
  { theme_code: "site_safety", family_code: "jobsite_environment", label_fr: "Sécurité du chantier", label_en: "Site Safety", description_fr: "Mesures de sécurité sur le chantier", description_en: "Jobsite safety measures", default_weight: 1.1, public_visible: true, matching_relevant: true, score_dimensions: ["environment", "trust"], negative_variant_of: null },

  // ─── overall_satisfaction family ───
  { theme_code: "would_recommend", family_code: "overall_satisfaction", label_fr: "Recommanderait", label_en: "Would Recommend", description_fr: "Le client recommanderait cet entrepreneur", description_en: "Client would recommend this contractor", default_weight: 1.2, public_visible: true, matching_relevant: true, score_dimensions: ["overall"], negative_variant_of: null },

  // ─── risk_flags family ───
  { theme_code: "risk_flag_general", family_code: "risk_flags", label_fr: "Signal d'alerte", label_en: "Risk Flag", description_fr: "Signal d'alerte général identifié", description_en: "General risk flag identified", default_weight: 1.3, public_visible: false, matching_relevant: true, score_dimensions: ["risk"], negative_variant_of: null },
];
