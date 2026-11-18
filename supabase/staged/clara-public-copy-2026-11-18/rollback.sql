-- Exact inverse of apply.sql (restores the previous wording).
update public.plan_features set teaser_copy = 'Accompagnement Alex avancé avec Signature.'
  where feature_key = 'alex_priority' and plan_code in ('home_decouverte','home_plus') and teaser_copy = 'Accompagnement Clara avancé avec Signature.';
update public.role_mismatch_content set secondary_cta_label = 'Parler à Alex'
  where id in ('e1c7bfde-1a47-48eb-b63d-1626551d3dae','176e1e8e-9cd9-470b-ac11-298c3957031f') and secondary_cta_label = 'Parler à Clara';
update public.navigation_fallback_pages set secondary_cta_label = 'Parler à Alex'
  where id in ('35bba21d-e72b-410a-b32e-0b8ce769821f','8f1ec69d-b368-4707-9618-615ebe54e3c4','3f618d53-e8b3-4256-ba1b-ac36ccba82f2','0cd2c88c-290c-4d1e-8980-f09f539150e6') and secondary_cta_label = 'Parler à Clara';
update public.navigation_fallback_pages set primary_cta_label = 'Parler à Alex'
  where id = '3ef102a5-7149-419e-8a4b-9bfac4558c58' and primary_cta_label = 'Parler à Clara';
update public.journal_entities set name = 'Alex', long_definition = replace(long_definition, 'Clara est l''interface', 'Alex est l''interface')
  where id = '9e299cc1-8c49-407d-8db3-b1d9895770f9' and name = 'Clara';
update public.journal_article_sections set heading = 'Le processus d''analyse avec Alex',
  body_md = replace(replace(body_md, '**Clara** n''est pas un chatbot. C''est une **conseillère IA en propriété** entraînée', '**Alex** n''est pas un chatbot. C''est un **conseiller IA en propriété** entraîné'), 'Concrètement, Clara :', 'Concrètement, Alex :')
  where id = '15905a79-975e-44c6-9ffb-410a098cc786' and heading = 'Le processus d''analyse avec Clara';
update public.journal_article_faqs set answer = replace(answer, 'Clara, elle, peut', 'Alex, lui, peut')
  where id = '6162dca6-0814-4766-9433-e55fbe5e4a4a' and answer like '%Clara, elle, peut%';
update public.journal_article_faqs set question = 'Combien de temps prend l''analyse avec Alex ?', answer = replace(answer, 'Clara pose une question', 'Alex pose une question')
  where id = 'd6685116-5e5b-4a15-a406-0806f3e4111b' and question = 'Combien de temps prend l''analyse avec Clara ?';
