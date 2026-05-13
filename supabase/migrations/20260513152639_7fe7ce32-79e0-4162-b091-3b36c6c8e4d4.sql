INSERT INTO public.contractors (
  user_id, business_name, slug, description, city, province, phone, website,
  rbq_number, neq, specialty, years_experience, rating, review_count,
  aipp_score, verification_status, admin_verified, is_published, is_discoverable
) VALUES
('00000000-0000-0000-0000-000000000001'::uuid, 'Construction Gagnon', 'construction-gagnon',
  'Construction Gagnon est une entreprise familiale fondée à Montréal en 2008, spécialisée dans la rénovation de cuisines et salles de bain haut de gamme. Notre équipe de 12 artisans certifiés transforme votre vision en réalité avec un souci du détail reconnu dans tout le Grand Montréal. Nous offrons une garantie écrite de 5 ans sur toute notre main-d''œuvre et travaillons exclusivement avec des matériaux québécois et nord-américains.',
  'Montréal', 'QC', '514-555-0142', 'https://construction-gagnon.ca',
  '5612-3456-78', '1170123456', 'Cuisine et salle de bain', 17, 4.8, 12, 87, 'verified', true, true, true),
('00000000-0000-0000-0000-000000000002'::uuid, 'Toitures Beaupré', 'toitures-beaupre',
  'Toitures Beaupré dessert la grande région de Québec depuis 2014. Spécialistes en toitures résidentielles — bardeaux d''asphalte, tôle pré-peinte et membrane élastomère. Nos couvreurs sont formés annuellement aux nouvelles normes de l''APCHQ et nous respectons rigoureusement les exigences d''Énergie Cadre pour les rénovations admissibles aux subventions provinciales.',
  'Québec', 'QC', '418-555-0188', 'https://toitures-beaupre.com',
  '5698-7654-32', '1187654321', 'Toiture résidentielle', 11, 4.5, 7, 72, 'pending', false, true, true),
('00000000-0000-0000-0000-000000000003'::uuid, 'Rénovations Lafortune', 'renovations-lafortune',
  'Rénovations Lafortune est un entrepreneur général basé à Laval qui orchestre des projets de rénovation complète depuis 2019. De la planification au nettoyage final, nous coordonnons plombiers, électriciens et menuisiers pour livrer votre projet clé en main, sans stress et dans les délais convenus. Plus de 60 résidences transformées sur la Rive-Nord.',
  'Laval', 'QC', '450-555-0234', NULL,
  '5634-2109-87', '1198765432', 'Entrepreneur général', 6, 4.2, 3, 65, 'verified', true, true, true)
ON CONFLICT (slug) DO UPDATE SET
  description = EXCLUDED.description, rating = EXCLUDED.rating, review_count = EXCLUDED.review_count,
  aipp_score = EXCLUDED.aipp_score, rbq_number = EXCLUDED.rbq_number, neq = EXCLUDED.neq,
  years_experience = EXCLUDED.years_experience, verification_status = EXCLUDED.verification_status,
  admin_verified = EXCLUDED.admin_verified, is_published = true, is_discoverable = true, updated_at = now();

INSERT INTO public.contractor_public_pages (
  contractor_id, slug, is_published, published_at,
  seo_title, seo_description, canonical_url, custom_sections, faq
)
SELECT c.id, c.slug, true, now(),
  c.business_name || ' à ' || c.city || ' — ' || c.specialty || ' | UNPRO',
  CASE c.slug
    WHEN 'construction-gagnon' THEN 'Construction Gagnon — Spécialiste cuisine et salle de bain à Montréal. RBQ 5612-3456-78, 17 ans d''expérience, score AIPP 87/100. Soumission gratuite en 24 h.'
    WHEN 'toitures-beaupre' THEN 'Toitures Beaupré — Couvreur résidentiel à Québec. Bardeau, tôle, membrane élastomère. RBQ valide, 11 ans d''expérience, note 4.5/5 sur UNPRO.'
    ELSE 'Rénovations Lafortune — Entrepreneur général à Laval. Rénovations clé en main, RBQ 5634-2109-87, vérifié par UNPRO. Soumission gratuite.'
  END,
  'https://unpro.ca/entrepreneur/' || c.slug,
  jsonb_build_object(
    'founded_year', CASE c.slug WHEN 'construction-gagnon' THEN 2008 WHEN 'toitures-beaupre' THEN 2014 ELSE 2019 END,
    'team_size', CASE c.slug WHEN 'construction-gagnon' THEN 12 WHEN 'toitures-beaupre' THEN 6 ELSE 4 END,
    'specialty_tags', CASE c.slug
      WHEN 'construction-gagnon' THEN jsonb_build_array('Cuisine','Salle de bain','Comptoir quartz','Armoires sur mesure')
      WHEN 'toitures-beaupre' THEN jsonb_build_array('Bardeau d''asphalte','Tôle pré-peinte','Membrane élastomère','Inspection toiture')
      ELSE jsonb_build_array('Rénovation complète','Sous-sol','Agrandissement','Coordination corps de métiers') END,
    'service_area', CASE c.slug
      WHEN 'construction-gagnon' THEN jsonb_build_array('Montréal','Laval','Longueuil','Brossard')
      WHEN 'toitures-beaupre' THEN jsonb_build_array('Québec','Lévis','Sainte-Foy','Charlesbourg')
      ELSE jsonb_build_array('Laval','Montréal-Nord','Bois-des-Filion','Terrebonne') END,
    'projects', CASE c.slug
      WHEN 'construction-gagnon' THEN jsonb_build_array(
        jsonb_build_object('id','1','type','Rénovation cuisine complète','city','Outremont','year',2024,'photo','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80'),
        jsonb_build_object('id','2','type','Salle de bain principale','city','Westmount','year',2024,'photo','https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80'),
        jsonb_build_object('id','3','type','Cuisine ouverte sur salon','city','Plateau-Mont-Royal','year',2023,'photo','https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800&q=80'),
        jsonb_build_object('id','4','type','Salle de bain familiale','city','Verdun','year',2023,'photo','https://images.unsplash.com/photo-1620626011761-996317b8d101?w=800&q=80'))
      WHEN 'toitures-beaupre' THEN jsonb_build_array(
        jsonb_build_object('id','1','type','Réfection bardeau d''asphalte','city','Sainte-Foy','year',2024,'photo','https://images.unsplash.com/photo-1632759145355-8b8a3a3aa3aa?w=800&q=80'),
        jsonb_build_object('id','2','type','Toiture en tôle pré-peinte','city','Lévis','year',2024,'photo','https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800&q=80'),
        jsonb_build_object('id','3','type','Membrane élastomère toit plat','city','Québec','year',2023,'photo','https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80'))
      ELSE jsonb_build_array(
        jsonb_build_object('id','1','type','Sous-sol fini avec salle familiale','city','Laval','year',2024,'photo','https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'),
        jsonb_build_object('id','2','type','Agrandissement deux étages','city','Bois-des-Filion','year',2023,'photo','https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80'),
        jsonb_build_object('id','3','type','Rénovation rez-de-chaussée','city','Terrebonne','year',2023,'photo','https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80')) END
  ),
  CASE c.slug
    WHEN 'construction-gagnon' THEN jsonb_build_array(
      jsonb_build_object('q','Quel est votre délai moyen pour une rénovation de cuisine?','a','Entre 4 et 8 semaines selon la complexité, incluant démolition, plomberie, électricité, ébénisterie et finition.'),
      jsonb_build_object('q','Travaillez-vous avec un designer?','a','Oui, nous offrons un service de design intégré sans frais additionnels pour tout projet de plus de 25 000 $.'))
    WHEN 'toitures-beaupre' THEN jsonb_build_array(
      jsonb_build_object('q','Quelle garantie offrez-vous sur la main-d''œuvre?','a','10 ans sur la pose, en plus de la garantie manufacturière du matériau (généralement 25 à 50 ans).'))
    ELSE jsonb_build_array(
      jsonb_build_object('q','Êtes-vous présent sur le chantier quotidiennement?','a','Oui, un chargé de projet est sur place chaque jour ouvrable et un rapport est partagé avec le client par courriel.')) END
FROM public.contractors c
WHERE c.slug IN ('construction-gagnon','toitures-beaupre','renovations-lafortune')
ON CONFLICT (slug) DO UPDATE SET
  is_published = true, custom_sections = EXCLUDED.custom_sections, faq = EXCLUDED.faq,
  seo_title = EXCLUDED.seo_title, seo_description = EXCLUDED.seo_description, updated_at = now();

INSERT INTO public.contractor_aipp_scores (
  contractor_id, total_score, score_confidence,
  identity_score, trust_score, visibility_score, conversion_score, ai_seo_readiness_score, is_current
)
SELECT c.id,
  CASE c.slug WHEN 'construction-gagnon' THEN 87 WHEN 'toitures-beaupre' THEN 72 ELSE 65 END,
  CASE c.slug WHEN 'construction-gagnon' THEN 92 WHEN 'toitures-beaupre' THEN 78 ELSE 70 END,
  CASE c.slug WHEN 'construction-gagnon' THEN 19 WHEN 'toitures-beaupre' THEN 15 ELSE 13 END,
  CASE c.slug WHEN 'construction-gagnon' THEN 18 WHEN 'toitures-beaupre' THEN 13 ELSE 12 END,
  CASE c.slug WHEN 'construction-gagnon' THEN 17 WHEN 'toitures-beaupre' THEN 14 ELSE 12 END,
  CASE c.slug WHEN 'construction-gagnon' THEN 13 WHEN 'toitures-beaupre' THEN 11 ELSE 10 END,
  CASE c.slug WHEN 'construction-gagnon' THEN 20 WHEN 'toitures-beaupre' THEN 19 ELSE 18 END,
  true
FROM public.contractors c
WHERE c.slug IN ('construction-gagnon','toitures-beaupre','renovations-lafortune')
  AND NOT EXISTS (SELECT 1 FROM public.contractor_aipp_scores s WHERE s.contractor_id = c.id AND s.is_current = true);

WITH ids AS (SELECT id, slug FROM public.contractors WHERE slug IN ('construction-gagnon','toitures-beaupre','renovations-lafortune'))
INSERT INTO public.reviews (contractor_id, user_id, rating, title, content, is_published, verification_status, created_at)
SELECT i.id, ('00000000-0000-0000-0000-00000000' || lpad((1000+row_number() over ())::text, 4, '0'))::uuid, r.rating, r.title, r.content, true, 'verified', r.created_at
FROM ids i
JOIN LATERAL (VALUES
  ('construction-gagnon', 5, 'Cuisine de rêve, équipe professionnelle', 'Marie L. — L''équipe de Construction Gagnon a rénové notre cuisine en 6 semaines comme promis. Travail propre, communication impeccable, résultat au-delà des attentes.', now() - interval '14 days'),
  ('construction-gagnon', 5, 'Salle de bain transformée', 'Sébastien D. — Refait notre salle de bain principale. Devis détaillé, aucune surprise sur la facture finale. Artisans ponctuels et respectueux.', now() - interval '32 days'),
  ('construction-gagnon', 4, 'Bon travail, petits délais', 'Annie P. — Excellent résultat final mais 1 semaine de retard sur l''échéancier initial. Compensé par un beau geste commercial.', now() - interval '58 days'),
  ('toitures-beaupre', 5, 'Toiture refaite en 2 jours', 'François T. — Bardeau d''asphalte 30 ans installé en 2 jours, terrain laissé impeccable. Prix compétitif et garantie sérieuse.', now() - interval '21 days'),
  ('toitures-beaupre', 4, 'Travail solide', 'Caroline M. — Très satisfaite de la pose et de la qualité du matériel. Petit bémol sur les délais de retour d''appel avant la signature.', now() - interval '47 days'),
  ('toitures-beaupre', 5, 'Inspection détaillée', 'Pierre G. — Ils ont identifié un problème d''entretoit que personne n''avait vu. Honnêteté rare dans le métier.', now() - interval '88 days'),
  ('renovations-lafortune', 5, 'Sous-sol clé en main', 'Julie R. — Sous-sol fini avec salle familiale et salle d''eau. Coordination parfaite des sous-traitants, projet livré à temps.', now() - interval '11 days'),
  ('renovations-lafortune', 4, 'Bonne communication', 'Marc-André B. — Rapport quotidien par courriel comme promis. Quelques ajustements de devis en cours de route mais bien expliqués.', now() - interval '40 days')
) AS r(rslug, rating, title, content, created_at) ON r.rslug = i.slug
WHERE NOT EXISTS (SELECT 1 FROM public.reviews rv WHERE rv.contractor_id = i.id AND rv.title = r.title);
