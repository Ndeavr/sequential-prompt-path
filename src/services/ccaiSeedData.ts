/**
 * UNPRO — CCAI Seed Data: 25 Alignment Questions
 */

export const CCAI_SEED_QUESTIONS = [
  // ─── 1. language_communication ───
  {
    code: "lang_technical",
    category: "language_communication",
    question_fr: "Quel niveau de langage technique préférez-vous pour discuter du projet?",
    question_en: "What level of technical language do you prefer when discussing the project?",
    answer_options: [
      { code: "simple", label_fr: "Simple et clair", label_en: "Simple and clear" },
      { code: "moderate", label_fr: "Modéré avec quelques termes techniques", label_en: "Moderate with some technical terms" },
      { code: "detailed", label_fr: "Détaillé et technique", label_en: "Detailed and technical" },
    ],
  },
  {
    code: "lang_contracts",
    category: "language_communication",
    question_fr: "Dans quelle langue préférez-vous que les contrats et documents soient rédigés?",
    question_en: "In which language do you prefer contracts and documents?",
    answer_options: [
      { code: "fr_only", label_fr: "Français seulement", label_en: "French only" },
      { code: "en_only", label_fr: "Anglais seulement", label_en: "English only" },
      { code: "bilingual", label_fr: "Bilingue", label_en: "Bilingual" },
    ],
  },
  {
    code: "lang_quick_comms",
    category: "language_communication",
    question_fr: "Pour les messages rapides (textos, courriels courts), quelle langue utilisez-vous?",
    question_en: "For quick messages (texts, short emails), what language do you use?",
    answer_options: [
      { code: "fr", label_fr: "Français", label_en: "French" },
      { code: "en", label_fr: "Anglais", label_en: "English" },
      { code: "either", label_fr: "Les deux me conviennent", label_en: "Either is fine" },
    ],
  },
  {
    code: "lang_safety_signs",
    category: "language_communication",
    question_fr: "Les affiches de sécurité et instructions sur le chantier devraient être en quelle langue?",
    question_en: "Safety signs and jobsite instructions should be in what language?",
    answer_options: [
      { code: "fr", label_fr: "Français", label_en: "French" },
      { code: "en", label_fr: "Anglais", label_en: "English" },
      { code: "bilingual", label_fr: "Bilingue", label_en: "Bilingual" },
      { code: "no_pref", label_fr: "Pas de préférence", label_en: "No preference" },
    ],
  },
  {
    code: "lang_misunderstood_terms",
    category: "language_communication",
    question_fr: "Si un terme technique n'est pas compris, que préférez-vous?",
    question_en: "If a technical term is misunderstood, what do you prefer?",
    answer_options: [
      { code: "explain_simply", label_fr: "Explication simple immédiate", label_en: "Immediate simple explanation" },
      { code: "written_glossary", label_fr: "Glossaire écrit fourni à l'avance", label_en: "Written glossary provided upfront" },
      { code: "ask_when_needed", label_fr: "Je demanderai si nécessaire", label_en: "I'll ask if needed" },
    ],
  },
  {
    code: "lang_group_meetings",
    category: "language_communication",
    question_fr: "Lors de réunions avec plusieurs personnes, comment gérez-vous les langues?",
    question_en: "During meetings with multiple people, how do you handle languages?",
    answer_options: [
      { code: "one_lang", label_fr: "Une seule langue pour tout le monde", label_en: "One language for everyone" },
      { code: "flexible", label_fr: "Flexible, chacun parle sa langue", label_en: "Flexible, each speaks their language" },
      { code: "translator", label_fr: "Un traducteur/interprète si nécessaire", label_en: "Translator/interpreter if needed" },
    ],
  },

  // ─── 2. involvement_complexity ───
  {
    code: "client_role",
    category: "involvement_complexity",
    question_fr: "Quel rôle préférez-vous jouer pendant le projet?",
    question_en: "What role do you prefer during the project?",
    answer_options: [
      { code: "hands_off", label_fr: "Minimal — faites votre travail", label_en: "Minimal — do your thing" },
      { code: "check_ins", label_fr: "Points réguliers mais pas quotidiens", label_en: "Regular check-ins but not daily" },
      { code: "deeply_involved", label_fr: "Très impliqué dans chaque décision", label_en: "Deeply involved in every decision" },
    ],
  },
  {
    code: "site_visit_freq",
    category: "involvement_complexity",
    question_fr: "À quelle fréquence souhaitez-vous des visites de chantier ou mises à jour?",
    question_en: "How often do you want site visits or updates?",
    answer_options: [
      { code: "weekly", label_fr: "Hebdomadaire", label_en: "Weekly" },
      { code: "biweekly", label_fr: "Aux deux semaines", label_en: "Bi-weekly" },
      { code: "milestones", label_fr: "À chaque étape importante seulement", label_en: "At major milestones only" },
    ],
  },
  {
    code: "field_decisions",
    category: "involvement_complexity",
    question_fr: "Pour les décisions mineures sur le chantier, que préférez-vous?",
    question_en: "For minor field decisions, what do you prefer?",
    answer_options: [
      { code: "autonomous", label_fr: "L'entrepreneur décide seul", label_en: "Contractor decides alone" },
      { code: "notify", label_fr: "Décide mais m'informe après", label_en: "Decides but notifies me after" },
      { code: "consult", label_fr: "Me consulter avant chaque décision", label_en: "Consult me before every decision" },
    ],
  },
  {
    code: "mid_project_changes",
    category: "involvement_complexity",
    question_fr: "Comment les changements en cours de projet devraient-ils être gérés?",
    question_en: "How should mid-project changes be handled?",
    answer_options: [
      { code: "verbal_ok", label_fr: "Accord verbal suffit", label_en: "Verbal agreement is fine" },
      { code: "written_email", label_fr: "Confirmation par courriel", label_en: "Email confirmation" },
      { code: "signed_change_order", label_fr: "Avenant signé obligatoire", label_en: "Signed change order required" },
    ],
  },
  {
    code: "finish_selection",
    category: "involvement_complexity",
    question_fr: "Qui devrait choisir les finis et matériaux?",
    question_en: "Who should select finishes and materials?",
    answer_options: [
      { code: "contractor", label_fr: "L'entrepreneur propose et choisit", label_en: "Contractor proposes and chooses" },
      { code: "collaborative", label_fr: "Décision conjointe", label_en: "Joint decision" },
      { code: "owner", label_fr: "Je choisis tout moi-même", label_en: "I choose everything myself" },
    ],
  },

  // ─── 3. scale_environment ───
  {
    code: "project_size",
    category: "scale_environment",
    question_fr: "Quelle taille de projet vous convient le mieux?",
    question_en: "What project size suits you best?",
    answer_options: [
      { code: "small", label_fr: "Petit (< 10 000$)", label_en: "Small (< $10,000)" },
      { code: "medium", label_fr: "Moyen (10 000$ - 50 000$)", label_en: "Medium ($10K–$50K)" },
      { code: "large", label_fr: "Grand (50 000$ +)", label_en: "Large ($50K+)" },
    ],
  },
  {
    code: "occupancy",
    category: "scale_environment",
    question_fr: "La maison sera-t-elle occupée pendant les travaux?",
    question_en: "Will the home be occupied during construction?",
    answer_options: [
      { code: "occupied", label_fr: "Oui, nous y vivrons", label_en: "Yes, we'll live there" },
      { code: "partially", label_fr: "Partiellement occupée", label_en: "Partially occupied" },
      { code: "vacant", label_fr: "Non, elle sera vacante", label_en: "No, it will be vacant" },
    ],
  },
  {
    code: "start_time",
    category: "scale_environment",
    question_fr: "À quelle heure les travaux devraient-ils commencer le matin?",
    question_en: "What time should work start in the morning?",
    answer_options: [
      { code: "early", label_fr: "Tôt (7h)", label_en: "Early (7 AM)" },
      { code: "normal", label_fr: "Normal (8h)", label_en: "Normal (8 AM)" },
      { code: "late", label_fr: "Plus tard (9h+)", label_en: "Later (9 AM+)" },
    ],
  },
  {
    code: "daily_cleanup",
    category: "scale_environment",
    question_fr: "Quel niveau de propreté quotidienne attendez-vous?",
    question_en: "What level of daily cleanup do you expect?",
    answer_options: [
      { code: "basic", label_fr: "Base — sécuritaire mais pas parfait", label_en: "Basic — safe but not perfect" },
      { code: "tidy", label_fr: "Rangé — tout en ordre chaque soir", label_en: "Tidy — everything in order each evening" },
      { code: "impeccable", label_fr: "Impeccable — comme si personne n'avait travaillé", label_en: "Impeccable — as if no one worked" },
    ],
  },
  {
    code: "noise_tolerance",
    category: "scale_environment",
    question_fr: "Quel est votre niveau de tolérance au bruit?",
    question_en: "What is your noise tolerance level?",
    answer_options: [
      { code: "high", label_fr: "Élevé — pas de problème", label_en: "High — no problem" },
      { code: "moderate", label_fr: "Modéré — avec horaires convenus", label_en: "Moderate — with agreed schedules" },
      { code: "low", label_fr: "Faible — minimiser absolument", label_en: "Low — minimize absolutely" },
    ],
  },

  // ─── 4. trust_values ───
  {
    code: "priority_value",
    category: "trust_values",
    question_fr: "Quelle est votre priorité principale?",
    question_en: "What is your main priority?",
    answer_options: [
      { code: "lowest_cost", label_fr: "Coût le plus bas", label_en: "Lowest cost" },
      { code: "highest_quality", label_fr: "Qualité la plus élevée", label_en: "Highest quality" },
      { code: "fastest_completion", label_fr: "Complétion la plus rapide", label_en: "Fastest completion" },
    ],
  },
  {
    code: "hidden_issue_response",
    category: "trust_values",
    question_fr: "Si un problème caché est découvert, que devrait faire l'entrepreneur?",
    question_en: "If a hidden issue is discovered, what should the contractor do?",
    answer_options: [
      { code: "fix_and_bill", label_fr: "Réparer et facturer les extras", label_en: "Fix and bill extras" },
      { code: "stop_and_discuss", label_fr: "Arrêter et discuter des options", label_en: "Stop and discuss options" },
      { code: "fix_within_budget", label_fr: "Trouver une solution dans le budget", label_en: "Find a solution within budget" },
    ],
  },
  {
    code: "conflict_handling",
    category: "trust_values",
    question_fr: "Comment préférez-vous gérer les désaccords?",
    question_en: "How do you prefer to handle disagreements?",
    answer_options: [
      { code: "direct", label_fr: "Discussion directe et franche", label_en: "Direct and frank discussion" },
      { code: "written", label_fr: "Par écrit pour avoir des traces", label_en: "In writing for documentation" },
      { code: "mediator", label_fr: "Via un médiateur ou tiers", label_en: "Through a mediator or third party" },
    ],
  },
  {
    code: "reference_checks",
    category: "trust_values",
    question_fr: "Comptez-vous vérifier les références avant de commencer?",
    question_en: "Do you plan to check references before starting?",
    answer_options: [
      { code: "yes_always", label_fr: "Oui, toujours", label_en: "Yes, always" },
      { code: "if_needed", label_fr: "Si le feeling n'est pas là", label_en: "If the feeling isn't right" },
      { code: "no_trust", label_fr: "Non, je fais confiance au processus UNPRO", label_en: "No, I trust the UNPRO process" },
    ],
  },
  {
    code: "payment_schedule",
    category: "trust_values",
    question_fr: "Quel calendrier de paiement préférez-vous?",
    question_en: "What payment schedule do you prefer?",
    answer_options: [
      { code: "milestone", label_fr: "Par étapes complétées", label_en: "By completed milestones" },
      { code: "progressive", label_fr: "Paiements progressifs réguliers", label_en: "Regular progressive payments" },
      { code: "end_heavy", label_fr: "Majorité à la fin", label_en: "Majority at the end" },
    ],
  },

  // ─── 5. professional_boundaries ───
  {
    code: "after_hours_comms",
    category: "professional_boundaries",
    question_fr: "Acceptez-vous les communications en dehors des heures de bureau?",
    question_en: "Do you accept after-hours communications?",
    answer_options: [
      { code: "yes", label_fr: "Oui, pas de problème", label_en: "Yes, no problem" },
      { code: "emergency_only", label_fr: "Urgences seulement", label_en: "Emergencies only" },
      { code: "no", label_fr: "Non, strictement pendant les heures", label_en: "No, strictly during hours" },
    ],
  },
  {
    code: "relationship_style",
    category: "professional_boundaries",
    question_fr: "Quel type de relation préférez-vous?",
    question_en: "What type of relationship do you prefer?",
    answer_options: [
      { code: "strictly_business", label_fr: "Strictement professionnel", label_en: "Strictly business" },
      { code: "friendly_pro", label_fr: "Professionnel mais amical", label_en: "Professional but friendly" },
      { code: "casual", label_fr: "Décontracté et informel", label_en: "Casual and informal" },
    ],
  },
  {
    code: "meet_subcontractors",
    category: "professional_boundaries",
    question_fr: "Souhaitez-vous rencontrer les sous-traitants?",
    question_en: "Do you want to meet subcontractors?",
    answer_options: [
      { code: "yes", label_fr: "Oui, je veux savoir qui travaille chez moi", label_en: "Yes, I want to know who works at my place" },
      { code: "optional", label_fr: "Optionnel, si l'occasion se présente", label_en: "Optional, if the opportunity arises" },
      { code: "no", label_fr: "Non, l'entrepreneur principal gère tout", label_en: "No, the main contractor handles everything" },
    ],
  },
  {
    code: "completion_definition",
    category: "professional_boundaries",
    question_fr: "Qui définit que le projet est terminé?",
    question_en: "Who defines when the project is complete?",
    answer_options: [
      { code: "owner", label_fr: "Le propriétaire décide", label_en: "The owner decides" },
      { code: "mutual", label_fr: "Accord mutuel avec liste de vérification", label_en: "Mutual agreement with checklist" },
      { code: "contractor", label_fr: "L'entrepreneur confirme selon le contrat", label_en: "Contractor confirms per contract" },
    ],
  },
];
