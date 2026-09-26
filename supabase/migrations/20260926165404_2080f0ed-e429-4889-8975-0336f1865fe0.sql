INSERT INTO public.appointments (
  homeowner_user_id, contractor_id, status, project_category,
  preferred_date, preferred_time_window, urgency_level, budget_range,
  timeline, contact_preference, notes, source_page, problem_summary
) VALUES (
  'aa17f6e4-2e81-491c-b93e-9295123cca13',
  '72bc8179-d836-497d-8114-e0fcd773281b',
  'requested',
  'qa_pipeline_test',
  (current_date + 7),
  'matin',
  'normal',
  '2000-5000',
  '2-4 semaines',
  'email',
  'TEST QA PIPELINE — vérification du cycle de statuts (demandé → confirmé → payé → activé). Aucun propriétaire réel. Aucun entrepreneur réel contacté. Aucun envoi.',
  'admin_qa_pipeline',
  'Rendez-vous de test pour valider le suivi des statuts en admin.'
);