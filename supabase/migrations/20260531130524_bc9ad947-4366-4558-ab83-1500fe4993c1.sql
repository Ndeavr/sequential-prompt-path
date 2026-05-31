
UPDATE public.signature_partners
SET
  legal_name = '9480-0976 Québec inc.',
  display_name = 'Isolation Solution Royal',
  tagline = 'Spécialiste de l''entretoit résidentiel au Québec',
  phone = '514-249-9522',
  address = '680 Chemin St Roch, Terrebonne, QC J6Y 1E1',
  source_url = 'https://isroyal.ca',
  services = '[
    {"name":"Isolation d''entretoit (R-51 soufflée)","slug":"isolation-entretoit","description":"Cellulose soufflée haute performance jusqu''à R-51 pour stopper les pertes de chaleur et l''inconfort à l''étage."},
    {"name":"Ventilation d''entretoit (1/300)","slug":"ventilation","description":"Correction de la ventilation soffites/évents selon la norme 1/300 pour éliminer condensation et barrages de glace."},
    {"name":"Étanchéité à l''air","slug":"etancheite","description":"Scellement des fuites d''air entre la maison et l''entretoit — la cause racine de la majorité des problèmes."},
    {"name":"Décontamination de moisissures","slug":"decontamination","description":"Retrait sécuritaire des moisissures dans l''entretoit avec traitement antifongique et restauration."},
    {"name":"Retrait de vermiculite","slug":"vermiculite","description":"Extraction conforme de la vermiculite amiantée par équipe certifiée, avant ré-isolation."},
    {"name":"Correction des barrages de glace","slug":"barrages-glace","description":"Diagnostic et correction durable des glaçons de toiture (isolation + ventilation + étanchéité)."}
  ]'::jsonb,
  coverage = '["Laval","Terrebonne","Laurentides","Lanaudière","Couronne Nord de Montréal","Montréal"]'::jsonb,
  certifications = '[
    {"label":"RBQ 5834-9101-01","verified":true},
    {"label":"Garantie 20 ans sur les travaux","verified":true},
    {"label":"20+ ans d''expérience","verified":true}
  ]'::jsonb,
  reviews_summary = '{"average":4.9,"count":319,"source":"Google"}'::jsonb
WHERE slug = 'isolation-solution-royal';
