-- Add columns for one-time pricing
ALTER TABLE public.plan_catalog
  ADD COLUMN IF NOT EXISTS one_time_price integer,
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'subscription';

-- 1) PRO — $349/mo
UPDATE public.plan_catalog
SET
  name = 'Pro',
  monthly_price = 34900,
  annual_price = 356000,
  highlighted = false,
  position_rank = 1,
  badge_text = 'Pour démarrer',
  short_pitch = 'Idéal pour les entrepreneurs en croissance.',
  tagline = 'Profil optimisé, visibilité IA, vos premiers rendez-vous exclusifs.',
  appointments_included = 5,
  features_json = '[
    "Profil UNPRO optimisé",
    "Boost de visibilité IA",
    "Jusqu''à 5 opportunités de rendez-vous / mois",
    "Analytique de base",
    "Synchronisation des avis",
    "Ciblage par ville"
  ]'::jsonb,
  project_sizes = '["S","M","L"]'::jsonb,
  appointment_notes = '["5 opportunités exclusives incluses","Acheter +RDV à l''unité quand vous voulez accélérer"]'::jsonb,
  billing_mode = 'subscription',
  active = true
WHERE code = 'pro_acq';

-- 2) PREMIUM — $599/mo (FEATURED)
INSERT INTO public.plan_catalog (
  code, name, monthly_price, annual_price, highlighted, position_rank,
  badge_text, short_pitch, tagline, appointments_included,
  features_json, project_sizes, appointment_notes, billing_mode, active,
  priority_level, matching_boost
)
VALUES (
  'premium_acq',
  'Premium',
  59900,
  611000,
  true,
  2,
  'Le plus populaire',
  'Le choix des entrepreneurs sérieux qui veulent doubler leur volume.',
  'Tout du plan Pro, plus le calendrier, le placement prioritaire et l''auto-match.',
  10,
  '[
    "Tout ce qui est inclus dans Pro",
    "Jusqu''à 10 opportunités de rendez-vous / mois",
    "Synchronisation calendrier",
    "Placement prioritaire dans les résultats",
    "Boost auto-match",
    "Priorité campagnes saisonnières",
    "Analytique avancée"
  ]'::jsonb,
  '["S","M","L","XL"]'::jsonb,
  '["10 rendez-vous exclusifs inclus chaque mois","Routage prioritaire vs Pro","+RDV à la carte ou en bloc"]'::jsonb,
  'subscription',
  true,
  3,
  20
)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  highlighted = EXCLUDED.highlighted,
  position_rank = EXCLUDED.position_rank,
  badge_text = EXCLUDED.badge_text,
  short_pitch = EXCLUDED.short_pitch,
  tagline = EXCLUDED.tagline,
  appointments_included = EXCLUDED.appointments_included,
  features_json = EXCLUDED.features_json,
  project_sizes = EXCLUDED.project_sizes,
  appointment_notes = EXCLUDED.appointment_notes,
  billing_mode = EXCLUDED.billing_mode,
  active = EXCLUDED.active,
  priority_level = EXCLUDED.priority_level,
  matching_boost = EXCLUDED.matching_boost;

-- 3) ÉLITE — $999/mo
UPDATE public.plan_catalog
SET
  name = 'Élite',
  monthly_price = 99900,
  annual_price = 1019000,
  highlighted = false,
  position_rank = 3,
  badge_text = 'Performance maximale',
  short_pitch = 'Pour dominer votre catégorie sur votre territoire.',
  tagline = 'Priorité territoriale, badge premium et concierge croissance.',
  appointments_included = 25,
  features_json = '[
    "Tout ce qui est inclus dans Premium",
    "Jusqu''à 25 opportunités de rendez-vous / mois",
    "Priorité territoriale",
    "Badge de confiance Premium",
    "Routage encore plus rapide",
    "Revue de croissance concierge",
    "Placement haute demande"
  ]'::jsonb,
  project_sizes = '["S","M","L","XL","XXL"]'::jsonb,
  appointment_notes = '["25 rendez-vous exclusifs inclus chaque mois","Priorité absolue dans le matching","+RDV à la carte ou en bloc"]'::jsonb,
  billing_mode = 'subscription',
  active = true,
  priority_level = 4,
  matching_boost = 35
WHERE code = 'elite_acq';

-- 4) STARTER — désactivé
UPDATE public.plan_catalog
SET active = false
WHERE code = 'starter';

-- 5) FOUNDER — $1997 one-time
UPDATE public.plan_catalog
SET
  name = 'Founder',
  monthly_price = 0,
  annual_price = 0,
  one_time_price = 199700,
  highlighted = false,
  position_rank = 4,
  badge_text = '30 places seulement',
  short_pitch = 'Verrouillez votre statut Founder avant le scale public.',
  tagline = 'Tarif préférentiel à vie, priorité territoriale et badge Founder.',
  appointments_included = 0,
  features_json = '[
    "Statut tarifaire préférentiel à vie",
    "Considération prioritaire de territoire",
    "Badge Founder exclusif",
    "Onboarding concierge personnalisé",
    "Conditions de lancement spéciales"
  ]'::jsonb,
  project_sizes = '["S","M","L","XL","XXL"]'::jsonb,
  appointment_notes = '["Paiement unique de 1 997 $ (taxes en sus)","30 places disponibles globalement","Avantages Founder verrouillés à vie"]'::jsonb,
  billing_mode = 'one_time',
  active = true,
  priority_level = 5,
  matching_boost = 50
WHERE code = 'founder_lifetime';