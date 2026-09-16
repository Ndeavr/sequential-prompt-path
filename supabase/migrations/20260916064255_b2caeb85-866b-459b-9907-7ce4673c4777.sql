CREATE TABLE IF NOT EXISTS public.offer_category_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_slug text NOT NULL,
  category_group text NOT NULL CHECK (category_group IN ('local_service','project_trade')),
  keyword text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category_group, keyword)
);

GRANT SELECT ON public.offer_category_keywords TO anon, authenticated;
GRANT ALL ON public.offer_category_keywords TO service_role;

ALTER TABLE public.offer_category_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS offer_category_keywords_public_read ON public.offer_category_keywords;
CREATE POLICY offer_category_keywords_public_read
  ON public.offer_category_keywords FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_offer_category_keywords_group ON public.offer_category_keywords (category_group);

INSERT INTO public.offer_category_keywords (category_slug, category_group, keyword) VALUES
('ouverture-fermeture-piscine','local_service','ouverture piscine'),
('ouverture-fermeture-piscine','local_service','fermeture piscine'),
('ouverture-fermeture-piscine','local_service','fermeture de piscine'),
('ouverture-fermeture-piscine','local_service','ouverture de piscine'),
('ouverture-fermeture-piscine','local_service','hivernation piscine'),
('entretien-piscine-spa','local_service','entretien piscine'),
('entretien-piscine-spa','local_service','entretien de piscine'),
('entretien-piscine-spa','local_service','entretien de spa'),
('entretien-piscine-spa','local_service','service de piscine'),
('entretien-piscine-spa','local_service','traitement eau piscine'),
('lavage-de-vitres','local_service','lavage de vitres'),
('lavage-de-vitres','local_service','lavage vitres'),
('lavage-de-vitres','local_service','laveur de vitres'),
('lavage-de-vitres','local_service','nettoyage de vitres'),
('lavage-de-vitres','local_service','lavage de fenetres'),
('lavage-de-vitres','local_service','nettoyage de fenetres'),
('nettoyage-gouttieres','local_service','nettoyage de gouttieres'),
('nettoyage-gouttieres','local_service','nettoyage gouttieres'),
('nettoyage-gouttieres','local_service','nettoyage de gouttiere'),
('lavage-pression','local_service','lavage a pression'),
('lavage-pression','local_service','lavage pression'),
('lavage-pression','local_service','nettoyage a pression'),
('lavage-pression','local_service','nettoyage exterieur'),
('abris-temporaires','local_service','abri tempo'),
('abris-temporaires','local_service','abris tempo'),
('abris-temporaires','local_service','abri d auto'),
('abris-temporaires','local_service','abri auto'),
('abris-temporaires','local_service','abri temporaire'),
('abris-temporaires','local_service','abris temporaires'),
('nettoyage-tapis','local_service','nettoyage de tapis'),
('nettoyage-tapis','local_service','nettoyage tapis'),
('nettoyage-tapis','local_service','carpette'),
('nettoyage-tapis','local_service','carpettes'),
('nettoyage-tapis','local_service','shampooing tapis'),
('nettoyage-mobilier','local_service','nettoyage de mobilier'),
('nettoyage-mobilier','local_service','meubles rembourres'),
('nettoyage-mobilier','local_service','tissus d ameublement'),
('nettoyage-mobilier','local_service','nettoyage de sofa'),
('nettoyage-mobilier','local_service','nettoyage de divan'),
('nettoyage-conduits','local_service','nettoyage de conduits'),
('nettoyage-conduits','local_service','conduit d air'),
('nettoyage-conduits','local_service','conduits d air'),
('nettoyage-conduits','local_service','conduit de secheuse'),
('nettoyage-conduits','local_service','echangeur d air'),
('entretien-menager','local_service','entretien menager'),
('entretien-menager','local_service','menage'),
('entretien-menager','local_service','femme de menage'),
('entretien-menager','local_service','nettoyage residentiel'),
('entretien-menager','local_service','service de menage'),
('entretien-menager','local_service','nettoyage de cuisine'),
('entretien-menager','local_service','nettoyage de cuisines'),
('entretien-menager','local_service','kitchen cleaning'),
('entretien-menager','local_service','house cleaning'),
('entretien-menager','local_service','cleaning service'),
('entretien-menager','local_service','cleaning services'),
('grand-menage','local_service','grand menage'),
('grand-menage','local_service','menage en profondeur'),
('grand-menage','local_service','grand nettoyage'),
('gestion-parasitaire','local_service','extermination'),
('gestion-parasitaire','local_service','exterminateur'),
('gestion-parasitaire','local_service','gestion parasitaire'),
('gestion-parasitaire','local_service','punaises'),
('gestion-parasitaire','local_service','controle des parasites'),
('entretien-gazon','local_service','gazon'),
('entretien-gazon','local_service','pelouse'),
('entretien-gazon','local_service','tonte'),
('entretien-gazon','local_service','entretien de pelouse'),
('entretien-gazon','local_service','entretien de gazon'),
('entretien-paysager','local_service','paysagement'),
('entretien-paysager','local_service','paysagiste'),
('entretien-paysager','local_service','amenagement paysager'),
('entretien-paysager','local_service','entretien paysager'),
('entretien-paysager','local_service','taille de haie'),
('deneigement','local_service','deneigement'),
('deneigement','local_service','deneiger'),
('deneigement','local_service','souffleuse'),
('nettoyage-planchers','local_service','nettoyage de planchers'),
('nettoyage-planchers','local_service','nettoyage de plancher'),
('nettoyage-planchers','local_service','nettoyage de ceramique'),
('nettoyage-planchers','local_service','nettoyage de coulis'),
('nettoyage-planchers','local_service','nettoyage de tuiles'),
('nettoyage-planchers','local_service','decapage de planchers'),
('nettoyage-planchers','local_service','floor cleaning'),
('nettoyage-planchers','local_service','tile cleaning'),
('nettoyage-planchers','local_service','tile and grout cleaning'),
('nettoyage-planchers','local_service','grout cleaning'),
('nettoyage-matelas','local_service','nettoyage de matelas'),
('nettoyage-apres-construction','local_service','nettoyage apres construction'),
('nettoyage-apres-construction','local_service','nettoyage apres renovation'),
('nettoyage-apres-construction','local_service','nettoyage de chantier'),
('nettoyage-apres-construction','local_service','nettoyage fin de chantier'),
('ramonage-cheminee','local_service','ramonage'),
('ramonage-cheminee','local_service','ramoneur'),
('homme-a-tout-faire','local_service','homme a tout faire'),
('homme-a-tout-faire','local_service','petits travaux'),
('homme-a-tout-faire','local_service','handyman'),
('homme-a-tout-faire','local_service','bricoleur'),
('demenagement','local_service','demenagement'),
('demenagement','local_service','demenageur'),
('demenagement','local_service','transport de meubles'),
('organisation-rangement','local_service','organisation et rangement'),
('organisation-rangement','local_service','desencombrement'),
('entretien-preventif-domicile','local_service','entretien preventif'),
('entretien-preventif-domicile','local_service','maintenance residentielle'),
('entretien-preventif-domicile','local_service','services a la maison'),
('debarras-ramassage','local_service','debarras'),
('debarras-ramassage','local_service','debarrasseur'),
('debarras-ramassage','local_service','ramassage d encombrants'),
('debarras-ramassage','local_service','ramassage encombrants'),
('debarras-ramassage','local_service','collecte d encombrants'),
('debarras-ramassage','local_service','enlevement d encombrants'),
('debarras-ramassage','local_service','encombrants'),
('debarras-ramassage','local_service','objets volumineux'),
('debarras-ramassage','local_service','ramassage d objets volumineux'),
('debarras-ramassage','local_service','enlevement de meubles'),
('debarras-ramassage','local_service','ramassage de meubles'),
('debarras-ramassage','local_service','vidage de maison'),
('debarras-ramassage','local_service','vidage de logement'),
('debarras-ramassage','local_service','vidage de garage'),
('debarras-ramassage','local_service','vidange de maison'),
('debarras-ramassage','local_service','vidage de sous sol'),
('debarras-ramassage','local_service','vidange de sous sol'),
('debarras-ramassage','local_service','nettoyage apres demenagement'),
('debarras-ramassage','local_service','collecte de gros rebuts'),
('debarras-ramassage','local_service','gros rebuts'),
('debarras-ramassage','local_service','junk removal'),
('debarras-ramassage','local_service','junk hauling'),
('debarras-ramassage','local_service','junk'),
('debarras-ramassage','local_service','bulky item removal'),
('debarras-ramassage','local_service','property cleanout'),
('debarras-ramassage','local_service','garage cleanout'),
('debarras-ramassage','local_service','basement cleanout'),
('debarras-ramassage','local_service','estate cleanout'),
('debarras-ramassage','local_service','cleanout'),
('entrepreneur-general','project_trade','entrepreneur general'),
('entrepreneur-general','project_trade','entrepreneurs generaux'),
('entrepreneur-general','project_trade','construction generale'),
('entrepreneur-general','project_trade','general contractor'),
('renovation','project_trade','renovation'),
('renovation','project_trade','renovations'),
('renovation','project_trade','renover'),
('renovation','project_trade','reno'),
('renovation','project_trade','cuisine et salle de bain'),
('renovation','project_trade','armoires de cuisine'),
('renovation','project_trade','salle de bain'),
('renovation','project_trade','menuiserie'),
('renovation','project_trade','charpente'),
('renovation','project_trade','gypse'),
('renovation','project_trade','revetement exterieur'),
('renovation','project_trade','portes et fenetres'),
('renovation','project_trade','remodeling'),
('fondation-drain-excavation','project_trade','fondation'),
('fondation-drain-excavation','project_trade','fondations'),
('fondation-drain-excavation','project_trade','drain francais'),
('fondation-drain-excavation','project_trade','drain'),
('fondation-drain-excavation','project_trade','excavation'),
('fondation-drain-excavation','project_trade','impermeabilisation'),
('fondation-drain-excavation','project_trade','fissure de fondation'),
('fondation-drain-excavation','project_trade','sous oeuvre'),
('toiture','project_trade','toiture'),
('toiture','project_trade','couvreur'),
('toiture','project_trade','couvreurs'),
('toiture','project_trade','toit'),
('toiture','project_trade','bardeaux'),
('toiture','project_trade','membrane elastomere'),
('toiture','project_trade','roofing'),
('plomberie','project_trade','plomberie'),
('plomberie','project_trade','plombier'),
('plomberie','project_trade','plombiers'),
('plomberie','project_trade','plumbing'),
('electricite','project_trade','electricite'),
('electricite','project_trade','electricien'),
('electricite','project_trade','electriciens'),
('electricite','project_trade','maitre electricien'),
('electricite','project_trade','electrical'),
('cvac-thermopompe','project_trade','cvac'),
('cvac-thermopompe','project_trade','cvc'),
('cvac-thermopompe','project_trade','thermopompe'),
('cvac-thermopompe','project_trade','thermopompes'),
('cvac-thermopompe','project_trade','climatisation'),
('cvac-thermopompe','project_trade','chauffage'),
('cvac-thermopompe','project_trade','ventilation'),
('cvac-thermopompe','project_trade','fournaise'),
('cvac-thermopompe','project_trade','hvac'),
('pavage','project_trade','pavage'),
('pavage','project_trade','asphalte'),
('pavage','project_trade','pave uni'),
('pavage','project_trade','paves'),
('pavage','project_trade','beton'),
('pavage','project_trade','maconnerie'),
('pavage','project_trade','briquetage'),
('pavage','project_trade','scellant asphalte'),
('amenagement-majeur','project_trade','amenagement exterieur'),
('amenagement-majeur','project_trade','terrassement'),
('amenagement-majeur','project_trade','muret'),
('amenagement-majeur','project_trade','terrasse'),
('amenagement-majeur','project_trade','patio'),
('amenagement-majeur','project_trade','piscine creusee'),
('amenagement-majeur','project_trade','installation de piscine'),
('amenagement-majeur','project_trade','cloture'),
('decontamination-vermiculite','project_trade','decontamination'),
('decontamination-vermiculite','project_trade','vermiculite'),
('decontamination-vermiculite','project_trade','amiante'),
('decontamination-vermiculite','project_trade','moisissure'),
('decontamination-vermiculite','project_trade','moisissures'),
('decontamination-vermiculite','project_trade','apres sinistre'),
('decontamination-vermiculite','project_trade','apres degat d eau'),
('decontamination-vermiculite','project_trade','restauration apres sinistre')
ON CONFLICT (category_group, keyword) DO NOTHING;

CREATE OR REPLACE FUNCTION public.normalize_offer_text(p_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT btrim(regexp_replace(
    lower(translate(coalesce(p_input, ''),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ',
      'aaaaaaceeeeiiiinooooouuuuyyAAAAAACEEEEIIIINOOOOOUUUUY')),
    '[^a-z0-9]+', ' ', 'g'));
$function$;

CREATE OR REPLACE FUNCTION public.normalize_offer_category_slug(p_label text)
RETURNS text
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_text text := public.normalize_offer_text(p_label);
  v_slug text;
BEGIN
  IF v_text IS NULL OR v_text = '' THEN RETURN NULL; END IF;

  -- Correspondance exacte sur un slug ou un nom de catégorie.
  SELECT slug INTO v_slug FROM public.founder_eligible_categories
  WHERE public.normalize_offer_text(replace(slug, '-', ' ')) = v_text
     OR public.normalize_offer_text(name_fr) = v_text
  LIMIT 1;
  IF v_slug IS NOT NULL THEN RETURN v_slug; END IF;

  SELECT slug INTO v_slug FROM public.project_trade_categories
  WHERE public.normalize_offer_text(replace(slug, '-', ' ')) = v_text
     OR public.normalize_offer_text(name_fr) = v_text
  LIMIT 1;
  IF v_slug IS NOT NULL THEN RETURN v_slug; END IF;

  -- Services résidentiels d'abord (mot-clé le plus long gagne).
  SELECT k.category_slug INTO v_slug
  FROM public.offer_category_keywords k
  WHERE k.category_group = 'local_service'
    AND position(k.keyword in v_text) > 0
  ORDER BY length(k.keyword) DESC
  LIMIT 1;
  IF v_slug IS NOT NULL THEN RETURN v_slug; END IF;

  SELECT k.category_slug INTO v_slug
  FROM public.offer_category_keywords k
  WHERE k.category_group = 'project_trade'
    AND position(k.keyword in v_text) > 0
  ORDER BY length(k.keyword) DESC
  LIMIT 1;

  RETURN v_slug;
END;
$function$;