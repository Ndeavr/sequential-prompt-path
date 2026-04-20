UPDATE public.plan_catalog
SET
  name = 'Recrue',
  monthly_price = 14900,
  annual_price = 152000, -- ~$127/mo billed yearly (~15% off)
  one_time_price = 0,
  highlighted = false,
  position_rank = 0,
  badge_text = 'Plan d''entrée',
  short_pitch = 'Pour tester UNPRO sans engagement.',
  tagline = 'Démarrez petit, voyez la qualité de nos rendez-vous, montez en gamme quand vous êtes prêt.',
  appointments_included = 1,
  features_json = '[
    "Profil UNPRO de base",
    "1 opportunité de rendez-vous garantie / mois",
    "Ciblage 1 ville",
    "Visibilité IA standard",
    "Synchronisation des avis",
    "Achat de rendez-vous supplémentaires à l''unité"
  ]'::jsonb,
  project_sizes = '["S","M"]'::jsonb,
  appointment_notes = '["1 rendez-vous exclusif inclus","Acheter +RDV à l''unité dès le 1er mois","Idéal pour tester avant de monter au Pro"]'::jsonb,
  billing_mode = 'subscription',
  active = true,
  priority_level = 1,
  matching_boost = 0
WHERE code = 'recrue';