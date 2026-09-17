-- Taxonomie canonique des métiers et sous-services (idempotent).
-- Aucun slug existant n'est supprimé ni renommé.

create temporary table _tax_seed (
  slug text primary key,
  parent_slug text not null,
  name_fr text not null,
  name_en text,
  sort_order int not null,
  ai_keywords text[]
) on commit drop;

insert into _tax_seed (slug, parent_slug, name_fr, name_en, sort_order, ai_keywords) values
-- ISOLATION
('isolation-entretoit-combles','isolation','Isolation d''entretoit / combles','Attic insulation',10,array['entretoit','comble','attic','grenier']),
('isolation-murs','isolation','Isolation des murs','Wall insulation',20,array['mur','wall']),
('isolation-sous-sol','isolation','Isolation sous-sol / fondation','Basement insulation',30,array['sous-sol','fondation','basement']),
('isolation-urethane','isolation','Isolation à l''uréthane giclé','Spray foam insulation',40,array['urethane','uréthane','giclé','spray foam','polyurethane']),
('isolation-cellulose','isolation','Cellulose soufflée','Blown cellulose',50,array['cellulose','soufflée','soufflee']),
('isolation-laine-soufflee','isolation','Laine soufflée','Blown mineral wool',60,array['laine soufflée','fibre de verre soufflée','blown wool']),
('scellage-air','isolation','Scellage d''air et fuites','Air sealing',70,array['scellage','étanchéité à l''air','fuite d''air','air sealing','calfeutrage']),
('pare-vapeur','isolation','Pare-vapeur','Vapour barrier',80,array['pare-vapeur','pare vapeur','vapour barrier']),
('ventilation-entretoit','isolation','Ventilation d''entretoit','Attic ventilation',90,array['ventilation','évent de toit','soffite','déflecteur']),
('retrait-isolant','isolation','Retrait d''isolant / vermiculite','Insulation removal',100,array['retrait isolant','vermiculite','enlèvement isolant','insulation removal']),
('decontamination-moisissure-isolation','isolation','Décontamination moisissure','Mold decontamination',110,array['moisissure','mold','champignon']),
('decontamination-excrements','isolation','Décontamination excréments','Droppings decontamination',120,array['excrément','excrement','rongeur','chauve-souris','droppings']),
-- PEINTURE
('peinture-interieure','peinture','Peinture intérieure','Interior painting',10,array['peinture intérieure','interior painting']),
('peinture-exterieure','peinture','Peinture extérieure','Exterior painting',20,array['peinture extérieure','exterior painting']),
('peinture-armoires','peinture','Peinture d''armoires','Cabinet painting',30,array['armoire','cabinet']),
('platre-joints','peinture','Plâtre et joints','Plaster and drywall finishing',40,array['plâtre','joint','gypse','drywall']),
('peinture-commerciale','peinture','Peinture commerciale','Commercial painting',50,array['commercial']),
('teinture-bois','peinture','Teinture et vernis','Staining and varnish',60,array['teinture','vernis','stain']),
-- TOITURE
('toiture-plate','toiture','Toiture plate','Flat roof',50,array['toit plat','membrane','flat roof']),
('gouttieres','toiture','Gouttières','Gutters',60,array['gouttière','gutter']),
('deneigement-toiture','toiture','Déneigement de toiture','Roof snow removal',70,array['déneigement','neige','snow removal']),
-- PLOMBERIE
('plomberie-urgence','plomberie','Urgence plomberie','Emergency plumbing',40,array['urgence','fuite','dégât d''eau','emergency']),
('drain-francais','plomberie','Drain français','French drain',50,array['drain français','drain francais','french drain']),
('inspection-camera','plomberie','Inspection par caméra','Camera inspection',60,array['caméra','camera','inspection drain']),
('salle-de-bain','plomberie','Rénovation de salle de bain','Bathroom renovation',70,array['salle de bain','bathroom']),
-- ÉLECTRICITÉ
('borne-recharge','electricite','Borne de recharge','EV charger',40,array['borne de recharge','ev charger','véhicule électrique']),
('generatrice','electricite','Génératrice','Generator',50,array['génératrice','generator']),
('mise-aux-normes','electricite','Mise aux normes électriques','Code compliance',60,array['mise aux normes','code']),
-- DÉCONTAMINATION
('amiante','decontamination','Amiante','Asbestos',10,array['amiante','asbestos']),
('apres-sinistre','decontamination','Nettoyage après sinistre','Post-disaster cleanup',20,array['sinistre','dégât d''eau','incendie','restoration']),
('vermiculite','decontamination','Vermiculite','Vermiculite',30,array['vermiculite']),
-- CVC
('thermopompe','cvc-chauffage','Thermopompe','Heat pump',10,array['thermopompe','heat pump']),
('climatisation','cvc-chauffage','Climatisation','Air conditioning',20,array['climatisation','air climatisé','ac']),
('fournaise','cvc-chauffage','Fournaise et chaudière','Furnace and boiler',30,array['fournaise','chaudière','furnace','boiler']),
('echangeur-air','cvc-chauffage','Échangeur d''air','Air exchanger',40,array['échangeur d''air','vrc','hrv']),
-- FENESTRATION
('fenetres','fenestration','Fenêtres','Windows',10,array['fenêtre','window']),
('portes','fenestration','Portes','Doors',20,array['porte','door']),
('portes-patio','fenestration','Portes-patio','Patio doors',30,array['patio']),
-- MAÇONNERIE
('brique-pierre','maconnerie','Brique et pierre','Brick and stone',10,array['brique','pierre','brick']),
('rejointoiement','maconnerie','Rejointoiement','Repointing',20,array['rejointoiement','joint de brique','repointing']),
('cheminee','maconnerie','Cheminée','Chimney',30,array['cheminée','chimney']),
-- PAYSAGEMENT
('pave-uni','paysagement','Pavé-uni','Paving stones',10,array['pavé','pave uni','paving']),
('amenagement-paysager','paysagement','Aménagement paysager','Landscaping',20,array['aménagement','landscaping','gazon']),
('cloture-terrasse','paysagement','Clôture et terrasse','Fence and deck',30,array['clôture','terrasse','patio','deck','fence']),
('asphalte','paysagement','Asphalte','Asphalt',40,array['asphalte','pavage','asphalt']);

insert into public.service_categories (name, slug, name_fr, name_en, parent_id, sort_order, is_active, ai_keywords)
select s.name_fr, s.slug, s.name_fr, s.name_en, p.id, s.sort_order, true, s.ai_keywords
from _tax_seed s
join public.service_categories p on p.slug = s.parent_slug and p.parent_id is null
on conflict (slug) do update
  set name_fr = coalesce(public.service_categories.name_fr, excluded.name_fr),
      name_en = coalesce(public.service_categories.name_en, excluded.name_en),
      parent_id = coalesce(public.service_categories.parent_id, excluded.parent_id),
      ai_keywords = coalesce(public.service_categories.ai_keywords, excluded.ai_keywords),
      updated_at = now();

-- Mots-clés de détection sur les métiers principaux (seulement s'ils sont absents).
update public.service_categories set ai_keywords = v.kw, updated_at = now()
from (values
  ('isolation', array['isolation','isolant','insulation','entretoit','uréthane']),
  ('toiture', array['toiture','couvreur','toit','roofing','roof']),
  ('plomberie', array['plomberie','plombier','plumbing']),
  ('electricite', array['électricité','electricite','électricien','electrician','electrical']),
  ('peinture', array['peinture','peintre','painting','painter']),
  ('maconnerie', array['maçonnerie','maconnerie','maçon','masonry']),
  ('cvc-chauffage', array['cvac','cvc','chauffage','climatisation','hvac']),
  ('menuiserie', array['menuiserie','menuisier','ébéniste','carpentry']),
  ('fenestration', array['fenestration','fenêtre','porte','window','door']),
  ('paysagement', array['paysagement','paysagiste','landscaping','pavé']),
  ('decontamination', array['décontamination','decontamination','moisissure','amiante','vermiculite']),
  ('drainage', array['drainage','drain','excavation']),
  ('fondation', array['fondation','foundation','fissure']),
  ('renovation-generale', array['rénovation','renovation','construction','général','general contractor']),
  ('plancher', array['plancher','revêtement de sol','flooring','céramique'])
) as v(slug, kw)
where public.service_categories.slug = v.slug
  and public.service_categories.parent_id is null
  and (public.service_categories.ai_keywords is null or cardinality(public.service_categories.ai_keywords) = 0);