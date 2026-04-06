
-- 1. Seed outreach campaign
INSERT INTO outreach_campaigns (
  id, name, campaign_type, status, language, primary_channel,
  default_sender_name, default_sender_email,
  daily_send_limit, hourly_send_limit, stop_on_conversion
) VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'AIPP Aperçu — ChatGPT Recommandation',
  'cold_outreach',
  'draft',
  'fr',
  'email',
  'UNPRO',
  'noreply@notify.unpro.ca',
  50,
  15,
  true
) ON CONFLICT (id) DO NOTHING;

-- 2. Seed sequence
INSERT INTO outreach_sequences (
  id, campaign_id, sequence_name, status
) VALUES (
  'a1b2c3d4-0002-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Séquence AIPP Aperçu 5 étapes',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- 3. Seed 5 sequence steps
INSERT INTO outreach_sequence_steps (
  id, sequence_id, step_order, channel_type, step_name,
  subject_template, body_template,
  delay_hours, track_opens, track_clicks, is_active,
  send_if_json, skip_if_json, stop_if_json
) VALUES
(
  'a1b2c3d4-0003-4000-8000-000000000001',
  'a1b2c3d4-0002-4000-8000-000000000001',
  1, 'email', 'Pitch principal AIPP',
  'Pourquoi ChatGPT recommanderait {{business_name}} plutôt qu''un autre ?',
  E'Bonjour {{first_name}},\n\nSi un client demandait aujourd''hui à ChatGPT quel entrepreneur contacter pour {{service}} à {{city}}, pourquoi recommanderait-il {{business_name}} plutôt qu''un autre ?\n\nÀ cause de vos avis ? De votre spécialisation ? De la clarté de votre offre ? De votre crédibilité en ligne ? Ou parce que votre profil est assez fort pour inspirer confiance immédiatement ?\n\nC''est exactement ce que notre aperçu AIPP permet d''estimer.\n\nOn peut vous montrer gratuitement :\n\n• pourquoi votre entreprise pourrait être recommandée\n• ce qui affaiblit encore votre visibilité\n• comment vous vous situez face à la concurrence\n• à quoi votre profil pourrait ressembler une fois optimisé\n\nRépondez simplement : Oui, envoyez-moi l''aperçu.\n\n— L''équipe UNPRO',
  0, true, true, true,
  '{"conditions": ["no_prior_contact"]}',
  '{"conditions": ["already_converted"]}',
  '{"conditions": ["replied", "converted", "unsubscribed"]}'
),
(
  'a1b2c3d4-0003-4000-8000-000000000002',
  'a1b2c3d4-0002-4000-8000-000000000001',
  2, 'email', 'Angle compétitif',
  'Votre concurrent est peut-être déjà devant vous sur ChatGPT',
  E'Bonjour {{first_name}},\n\nQuand un propriétaire demande à ChatGPT de recommander un entrepreneur pour {{service}} à {{city}}, l''IA ne tire pas au hasard.\n\nElle analyse la crédibilité, les avis, la spécialisation, la clarté de l''offre.\n\nCertains de vos concurrents ont peut-être déjà un profil plus fort que le vôtre — même sans le savoir.\n\nNotre aperçu AIPP vous montre exactement où vous vous situez et ce que vous pouvez améliorer.\n\nC''est gratuit, rapide et sans engagement.\n\nRépondez : Oui, je veux voir.\n\n— L''équipe UNPRO',
  72, true, true, true,
  '{"conditions": ["no_open_step_1"]}',
  '{"conditions": ["replied_step_1"]}',
  '{"conditions": ["replied", "converted", "unsubscribed"]}'
),
(
  'a1b2c3d4-0003-4000-8000-000000000003',
  'a1b2c3d4-0002-4000-8000-000000000001',
  3, 'email', 'Angle curiosité / données',
  'Ce que ChatGPT voit quand on cherche {{service}} à {{city}}',
  E'Bonjour {{first_name}},\n\nSavez-vous ce que ChatGPT répond quand un propriétaire demande : « Quel entrepreneur recommander pour {{service}} à {{city}} ? »\n\nL''IA analyse des dizaines de signaux : avis, spécialisation, présence en ligne, clarté de l''offre, crédibilité.\n\nAvec un aperçu AIPP, vous voyez :\n\n• ce que l''IA perçoit de votre entreprise\n• ce qui vous manque pour ressortir\n• comment vous comparer à la concurrence\n• à quoi ressemblerait votre profil optimisé\n\nGratuit. Sans engagement. Répondez : Oui.\n\n— L''équipe UNPRO',
  96, true, true, true,
  '{"conditions": ["opened_but_no_reply"]}',
  '{"conditions": ["replied"]}',
  '{"conditions": ["replied", "converted", "unsubscribed"]}'
),
(
  'a1b2c3d4-0003-4000-8000-000000000004',
  'a1b2c3d4-0002-4000-8000-000000000001',
  4, 'email', 'Rappel doux',
  'Votre aperçu AIPP est toujours disponible',
  E'Bonjour {{first_name}},\n\nJe voulais simplement vous rappeler que votre aperçu AIPP est toujours disponible.\n\nEn quelques secondes, vous verrez :\n\n• pourquoi {{business_name}} pourrait être recommandé par l''IA\n• ce qui freine votre visibilité\n• comment vous vous comparez\n\nPas de formulaire. Pas d''engagement. Juste une vue claire de votre position.\n\nRépondez : Oui, envoyez-moi l''aperçu.\n\n— L''équipe UNPRO',
  168, true, true, true,
  '{"conditions": ["no_reply_after_step_3"]}',
  '{"conditions": ["replied"]}',
  '{"conditions": ["replied", "converted", "unsubscribed"]}'
),
(
  'a1b2c3d4-0003-4000-8000-000000000005',
  'a1b2c3d4-0002-4000-8000-000000000001',
  5, 'email', 'Urgence — dernier envoi',
  'Dernière chance : votre aperçu AIPP expire bientôt',
  E'Bonjour {{first_name}},\n\nC''est le dernier message que je vous envoie à ce sujet.\n\nVotre aperçu AIPP gratuit — celui qui montre pourquoi {{business_name}} serait (ou ne serait pas) recommandé par ChatGPT pour {{service}} à {{city}} — sera archivé bientôt.\n\nSi vous voulez le voir avant, répondez simplement : Oui.\n\nSinon, aucun souci. On ne vous relancera plus.\n\n— L''équipe UNPRO',
  336, true, true, true,
  '{"conditions": ["no_reply_after_step_4"]}',
  '{"conditions": ["replied"]}',
  '{"conditions": ["replied", "converted", "unsubscribed"]}'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Seed outreach templates
INSERT INTO outreach_templates (id, template_name, channel_type, language, template_type, subject_template, body_template)
VALUES
  ('a1b2c3d4-0004-4000-8000-000000000001', 'aipp-apercu-pitch-principal', 'email', 'fr', 'cold_outreach',
   'Pourquoi ChatGPT recommanderait {{business_name}} plutôt qu''un autre ?',
   E'Bonjour {{first_name}},\n\nSi un client demandait aujourd''hui à ChatGPT quel entrepreneur contacter pour {{service}} à {{city}}, pourquoi recommanderait-il {{business_name}} plutôt qu''un autre ?\n\nÀ cause de vos avis ? De votre spécialisation ? De la clarté de votre offre ? De votre crédibilité en ligne ? Ou parce que votre profil est assez fort pour inspirer confiance immédiatement ?\n\nC''est exactement ce que notre aperçu AIPP permet d''estimer.\n\nOn peut vous montrer gratuitement :\n\n• pourquoi votre entreprise pourrait être recommandée\n• ce qui affaiblit encore votre visibilité\n• comment vous vous situez face à la concurrence\n• à quoi votre profil pourrait ressembler une fois optimisé\n\nRépondez simplement : Oui, envoyez-moi l''aperçu.\n\n— L''équipe UNPRO'),
  ('a1b2c3d4-0004-4000-8000-000000000002', 'aipp-apercu-focus-court', 'email', 'fr', 'cold_outreach',
   'Pourquoi ChatGPT recommanderait {{business_name}} ?',
   E'Bonjour {{first_name}},\n\nSi un client demandait à ChatGPT quel entrepreneur choisir pour {{service}} à {{city}}, qu''est-ce qui ferait ressortir {{business_name}} ?\n\nC''est ce qu''on peut vous montrer gratuitement.\n\nAvec un aperçu AIPP, vous voyez :\n\n• pourquoi votre entreprise pourrait être recommandée\n• ce qui freine encore votre visibilité\n• comment vous vous comparez à la concurrence\n• à quoi votre profil pourrait ressembler une fois optimisé\n\nRépondez simplement : Oui, envoyez-moi l''aperçu.\n\n— L''équipe UNPRO')
ON CONFLICT (id) DO NOTHING;

-- 5. Register outreach agent
INSERT INTO agent_registry (
  agent_key, agent_name, domain, layer, status, autonomy_level,
  mission, triggers, actions, inputs, outputs, tools
) VALUES (
  'outreach-aipp-sequence',
  'Agent Outreach AIPP Séquence',
  'acquisition',
  'operational',
  'active',
  'semi_auto',
  'Exécuter la séquence d''outreach AIPP en 5 étapes pour convertir les prospects en utilisateurs UNPRO via l''aperçu AIPP gratuit.',
  '["campaign_launched", "step_delay_reached", "prospect_added"]'::jsonb,
  '["send_email_step", "check_open", "check_reply", "stop_sequence", "advance_step", "log_conversion"]'::jsonb,
  '["prospect_data", "campaign_config", "sequence_steps", "delivery_events"]'::jsonb,
  '["email_sent", "open_tracked", "reply_detected", "conversion_logged", "sequence_stopped"]'::jsonb,
  '["dispatch-outreach-batch", "evaluate-followup-rules"]'::jsonb
) ON CONFLICT (agent_key) DO UPDATE SET
  status = 'active',
  mission = EXCLUDED.mission,
  triggers = EXCLUDED.triggers,
  actions = EXCLUDED.actions,
  updated_at = now();

-- 6. Create agent task for scheduling
INSERT INTO agent_tasks (
  agent_name, agent_key, agent_domain, task_title, task_description,
  status, urgency, impact_score, auto_executable, execution_mode
) VALUES (
  'Agent Outreach AIPP Séquence',
  'outreach-aipp-sequence',
  'acquisition',
  'Lancer campagne AIPP Aperçu ChatGPT',
  'Activer la séquence 5 étapes AIPP pour les prospects qualifiés. Step 1: pitch principal J0, Step 2: angle compétitif J3, Step 3: curiosité/données J7, Step 4: rappel doux J14, Step 5: urgence J21. Arrêt automatique sur réponse ou conversion.',
  'proposed',
  'high',
  85,
  false,
  'scheduled'
);

-- 7. Seed subject line variants
INSERT INTO outreach_template_versions (id, template_id, version_number, subject_template, body_template)
VALUES
  (gen_random_uuid(), 'a1b2c3d4-0004-4000-8000-000000000001', 1,
   'Pourquoi ChatGPT recommanderait {{business_name}} plutôt qu''un autre ?', NULL),
  (gen_random_uuid(), 'a1b2c3d4-0004-4000-8000-000000000001', 2,
   'Pourquoi vous… et pas un concurrent ?', NULL),
  (gen_random_uuid(), 'a1b2c3d4-0004-4000-8000-000000000001', 3,
   'Votre entreprise sortirait-elle dans une recommandation IA ?', NULL),
  (gen_random_uuid(), 'a1b2c3d4-0004-4000-8000-000000000001', 4,
   'Qu''est-ce qui ferait ressortir {{business_name}} ?', NULL),
  (gen_random_uuid(), 'a1b2c3d4-0004-4000-8000-000000000001', 5,
   'Pourquoi l''IA choisirait-elle votre entreprise ?', NULL)
ON CONFLICT DO NOTHING;
