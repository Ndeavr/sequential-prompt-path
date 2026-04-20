-- Désactiver les anciens plans (sans les supprimer pour préserver l'historique)
UPDATE public.plan_catalog
SET active = false, updated_at = now()
WHERE code IN ('recrue', 'pro', 'premium', 'elite', 'signature');

-- Insérer les 4 nouveaux plans Acquisition Machine
INSERT INTO public.plan_catalog (code, name, position_rank, monthly_price, annual_price, setup_fee, badge_text, short_pitch, best_for, summary_outcome, tagline, active)
VALUES
  ('starter', 'Starter', 1, 29700, 297000, 0, 'Démarrage', 'Lancez votre acquisition de clients en moins de 24 h.', 'Entrepreneurs solos qui veulent valider la machine UNPRO.', 'Premiers rendez-vous qualifiés livrés directement dans votre calendrier.', 'Activez votre première vague de rendez-vous.', true),
  ('pro_acq', 'Pro', 2, 59900, 599000, 0, 'Le plus populaire', 'Multipliez par 3 le volume de rendez-vous mensuels.', 'PME établies prêtes à scaler leur pipeline.', 'Pipeline auto-alimenté avec relances et SMS automatisés.', 'Doublez votre flux de RDV qualifiés.', true),
  ('elite_acq', 'Élite', 3, 99900, 999000, 0, 'Performance maximale', 'Domination territoriale complète sur votre zone.', 'Entreprises matures cherchant à dominer leur marché local.', 'Couverture exclusive multi-villes avec priorité sur les leads premium.', 'Verrouillez votre territoire.', true),
  ('founder_lifetime', 'Founder Lifetime', 4, 0, 0, 199700, 'À vie • 100 places', 'Accès illimité à vie + tarif Founder verrouillé.', 'Visionnaires qui veulent l''avantage permanent.', 'Tous les modules présents et futurs, pour toujours.', 'Verrouillez votre place de Founder.', true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  position_rank = EXCLUDED.position_rank,
  monthly_price = EXCLUDED.monthly_price,
  annual_price = EXCLUDED.annual_price,
  setup_fee = EXCLUDED.setup_fee,
  badge_text = EXCLUDED.badge_text,
  short_pitch = EXCLUDED.short_pitch,
  best_for = EXCLUDED.best_for,
  summary_outcome = EXCLUDED.summary_outcome,
  tagline = EXCLUDED.tagline,
  active = true,
  updated_at = now();