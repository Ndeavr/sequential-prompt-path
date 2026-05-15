
-- ============ Brand Engine Phase 1 ============

-- 1. brand_categories
CREATE TABLE IF NOT EXISTS public.brand_categories (
  slug text PRIMARY KEY,
  label_fr text NOT NULL,
  label_en text NOT NULL,
  tier text NOT NULL DEFAULT 'standard' CHECK (tier IN ('luxury','premium','standard','budget','professional')),
  display_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. brands
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  category text REFERENCES public.brand_categories(slug) ON DELETE SET NULL,
  subcategory text,
  country text DEFAULT 'CA',
  premium_score int NOT NULL DEFAULT 50 CHECK (premium_score BETWEEN 0 AND 100),
  trust_score int NOT NULL DEFAULT 50 CHECK (trust_score BETWEEN 0 AND 100),
  market_position text DEFAULT 'mainstream' CHECK (market_position IN ('luxury','premium','mainstream','budget','professional','commercial')),
  logo_svg_url text,
  logo_png_url text,
  logo_grey_svg_url text,
  logo_grey_png_url text,
  website text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brands_category ON public.brands(category) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_brands_premium ON public.brands(premium_score DESC) WHERE is_active;

-- 3. brand_aliases
CREATE TABLE IF NOT EXISTS public.brand_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  alias text NOT NULL,
  alias_normalized text NOT NULL,
  locale text DEFAULT 'fr-CA',
  is_primary boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, alias_normalized)
);
CREATE INDEX IF NOT EXISTS idx_brand_aliases_normalized ON public.brand_aliases(alias_normalized);

-- 4. brand_logos
CREATE TABLE IF NOT EXISTS public.brand_logos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  variant text NOT NULL CHECK (variant IN ('color','grey','white','black','transparent')),
  format text NOT NULL CHECK (format IN ('svg','png','webp')),
  url text NOT NULL,
  width int,
  height int,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, variant, format)
);

-- 5. contractor_brand_profiles
CREATE TABLE IF NOT EXISTS public.contractor_brand_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  confidence_score int NOT NULL DEFAULT 50 CHECK (confidence_score BETWEEN 0 AND 100),
  source_type text NOT NULL CHECK (source_type IN ('website','ocr','photo','review','alex_chat','manual','onboarding','social','seed')),
  source_reference text,
  is_primary_ecosystem boolean NOT NULL DEFAULT false,
  is_certified boolean NOT NULL DEFAULT false,
  detected_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE(contractor_id, brand_id)
);
CREATE INDEX IF NOT EXISTS idx_contractor_brand_profiles_contractor ON public.contractor_brand_profiles(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contractor_brand_profiles_brand ON public.contractor_brand_profiles(brand_id);

-- 6. brand_detection_logs
CREATE TABLE IF NOT EXISTS public.brand_detection_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  source_type text NOT NULL,
  source_reference text,
  raw_text text,
  brands_found jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending','processing','completed','failed')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_brand_detection_logs_contractor ON public.brand_detection_logs(contractor_id, created_at DESC);

-- 7. brand_scores
CREATE TABLE IF NOT EXISTS public.brand_scores (
  contractor_id uuid PRIMARY KEY,
  ecosystem_quality int NOT NULL DEFAULT 0 CHECK (ecosystem_quality BETWEEN 0 AND 100),
  premium_score int NOT NULL DEFAULT 0 CHECK (premium_score BETWEEN 0 AND 100),
  commercial_score int NOT NULL DEFAULT 0 CHECK (commercial_score BETWEEN 0 AND 100),
  technical_score int NOT NULL DEFAULT 0 CHECK (technical_score BETWEEN 0 AND 100),
  luxury_score int NOT NULL DEFAULT 0 CHECK (luxury_score BETWEEN 0 AND 100),
  budget_tier text NOT NULL DEFAULT 'standard' CHECK (budget_tier IN ('luxury','premium','standard','budget','professional','commercial')),
  brand_count int NOT NULL DEFAULT 0,
  primary_ecosystem text,
  computed_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 8. brand_relationships
CREATE TABLE IF NOT EXISTS public.brand_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  related_brand_id uuid NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  relation_type text NOT NULL CHECK (relation_type IN ('parent','subsidiary','competitor','ecosystem','certifies','distributes','complements')),
  strength int DEFAULT 50 CHECK (strength BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(brand_id, related_brand_id, relation_type)
);

-- 9. brand_assets_cache
CREATE TABLE IF NOT EXISTS public.brand_assets_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text NOT NULL UNIQUE,
  content_hash text,
  storage_path text NOT NULL,
  content_type text,
  file_size int,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.brands_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_brands_updated ON public.brands;
CREATE TRIGGER trg_brands_updated BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.brands_set_updated_at();

-- ===== RLS =====
ALTER TABLE public.brand_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_logos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_brand_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_detection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_assets_cache ENABLE ROW LEVEL SECURITY;

-- Public-read catalog
CREATE POLICY "brand_categories_public_read" ON public.brand_categories FOR SELECT USING (true);
CREATE POLICY "brands_public_read" ON public.brands FOR SELECT USING (is_active = true);
CREATE POLICY "brand_aliases_public_read" ON public.brand_aliases FOR SELECT USING (true);
CREATE POLICY "brand_logos_public_read" ON public.brand_logos FOR SELECT USING (true);
CREATE POLICY "brand_relationships_public_read" ON public.brand_relationships FOR SELECT USING (true);

-- Contractor brand info publicly readable
CREATE POLICY "contractor_brand_profiles_public_read" ON public.contractor_brand_profiles FOR SELECT USING (true);
CREATE POLICY "brand_scores_public_read" ON public.brand_scores FOR SELECT USING (true);

-- Admin-only writes (using existing has_role)
CREATE POLICY "brand_categories_admin_write" ON public.brand_categories FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "brands_admin_write" ON public.brands FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "brand_aliases_admin_write" ON public.brand_aliases FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "brand_logos_admin_write" ON public.brand_logos FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "brand_relationships_admin_write" ON public.brand_relationships FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "contractor_brand_profiles_admin_write" ON public.contractor_brand_profiles FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "brand_scores_admin_write" ON public.brand_scores FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- Admin-only read+write for logs/cache
CREATE POLICY "brand_detection_logs_admin_all" ON public.brand_detection_logs FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));
CREATE POLICY "brand_assets_cache_admin_all" ON public.brand_assets_cache FOR ALL
  USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

-- ===== Storage bucket =====
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets','brand-assets', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "brand_assets_public_read" ON storage.objects FOR SELECT
  USING (bucket_id = 'brand-assets');
CREATE POLICY "brand_assets_admin_write" ON storage.objects FOR ALL
  USING (bucket_id = 'brand-assets' AND public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (bucket_id = 'brand-assets' AND public.has_role(auth.uid(),'admin'::public.app_role));

-- ===== Seed: categories =====
INSERT INTO public.brand_categories (slug,label_fr,label_en,tier,display_order) VALUES
  ('power_tools','Outils électriques','Power tools','professional',10),
  ('heavy_equipment','Machinerie lourde','Heavy equipment','professional',20),
  ('roofing','Toiture','Roofing','standard',30),
  ('insulation','Isolation','Insulation','standard',40),
  ('landscaping','Aménagement paysager','Landscaping','standard',50),
  ('hvac','CVAC','HVAC','premium',60),
  ('electrical','Électricité','Electrical','standard',70),
  ('plumbing','Plomberie','Plumbing','standard',80),
  ('waterproofing','Imperméabilisation','Waterproofing','premium',90),
  ('windows_doors','Portes & fenêtres','Windows & doors','premium',100),
  ('rental_equipment','Location d''équipement','Rental equipment','standard',110),
  ('supplier','Fournisseur','Supplier','standard',120),
  ('flooring','Revêtements de sol','Flooring','standard',130),
  ('cabinetry','Armoires & cuisines','Cabinetry','premium',140),
  ('decking','Patios & terrasses','Decking','premium',150),
  ('paint_coatings','Peinture & enduits','Paint & coatings','standard',160),
  ('fasteners','Fixations & attaches','Fasteners','standard',170),
  ('siding','Revêtement extérieur','Siding','standard',180)
ON CONFLICT (slug) DO NOTHING;

-- ===== Seed: brands (~60) =====
INSERT INTO public.brands (name, slug, category, country, premium_score, trust_score, market_position, website, description) VALUES
  -- Roofing
  ('SOPREMA','soprema','roofing','CA',92,95,'premium','https://www.soprema.ca','Membranes élastomères et systèmes de toiture commerciale.'),
  ('GAF','gaf','roofing','US',85,92,'premium','https://www.gaf.com','Bardeaux et systèmes de toiture résidentielle.'),
  ('IKO','iko','roofing','CA',75,82,'mainstream','https://www.iko.com','Bardeaux et membranes — fabricant canadien.'),
  ('BP Canada','bp-canada','roofing','CA',72,80,'mainstream','https://www.bpcan.com','Bardeaux et produits de toiture canadiens.'),
  ('CertainTeed','certainteed','roofing','US',78,84,'premium','https://www.certainteed.com','Matériaux de construction (toiture, isolation, gypse).'),
  ('Owens Corning','owens-corning','roofing','US',82,88,'premium','https://www.owenscorning.com','Bardeaux Duration et isolation rose.'),
  -- Insulation
  ('Rockwool','rockwool','insulation','CA',88,92,'premium','https://www.rockwool.com','Isolant en laine de roche ignifuge.'),
  ('Knauf','knauf','insulation','DE',80,85,'premium','https://www.knauf.com','Isolation et systèmes de gypse.'),
  ('Demilec','demilec','insulation','CA',82,86,'premium','https://www.demilec.com','Mousse de polyuréthane giclée.'),
  -- Windows & doors
  ('Pella','pella','windows_doors','US',82,88,'premium','https://www.pella.com','Fenêtres et portes haut de gamme.'),
  ('Andersen','andersen','windows_doors','US',85,90,'premium','https://www.andersenwindows.com','Fabricant de fenêtres et portes premium.'),
  ('Velux','velux','windows_doors','DK',88,92,'premium','https://www.velux.com','Puits de lumière et fenêtres de toit.'),
  ('Marvin','marvin','windows_doors','US',87,90,'luxury','https://www.marvin.com','Fenêtres et portes sur mesure haut de gamme.'),
  -- Siding
  ('Maibec','maibec','siding','CA',85,90,'premium','https://www.maibec.com','Revêtement de bois canadien préfinis.'),
  ('James Hardie','james-hardie','siding','US',88,92,'premium','https://www.jameshardie.com','Revêtement en fibrociment.'),
  -- Decking
  ('TimberTech','timbertech','decking','US',88,90,'premium','https://www.timbertech.com','Patios composites haut de gamme.'),
  ('Trex','trex','decking','US',82,88,'premium','https://www.trex.com','Patios et clôtures composites.'),
  -- Power tools
  ('Hilti','hilti','power_tools','LI',95,96,'professional','https://www.hilti.ca','Outils professionnels et systèmes d''ancrage.'),
  ('Festool','festool','power_tools','DE',92,94,'luxury','https://www.festool.com','Outils électriques premium.'),
  ('Makita','makita','power_tools','JP',82,88,'professional','https://www.makita.ca','Outils électriques fiables.'),
  ('DeWalt','dewalt','power_tools','US',78,86,'professional','https://www.dewalt.com','Outils électriques professionnels.'),
  ('Milwaukee','milwaukee','power_tools','US',85,90,'professional','https://www.milwaukeetool.ca','Outils sans fil M18 / M12.'),
  ('Bosch','bosch','power_tools','DE',82,88,'professional','https://www.bosch.ca','Outils et instruments de mesure.'),
  ('Ryobi','ryobi','power_tools','JP',60,72,'mainstream','https://www.ryobitools.com','Outils sans fil grand public.'),
  -- Heavy equipment / rental
  ('Caterpillar','caterpillar','heavy_equipment','US',92,94,'professional','https://www.cat.com','Machinerie lourde et équipement de chantier.'),
  ('Kubota','kubota','heavy_equipment','JP',85,90,'professional','https://www.kubota.ca','Tracteurs, excavatrices compactes.'),
  ('John Deere','john-deere','heavy_equipment','US',85,92,'professional','https://www.deere.ca','Machinerie de construction et agricole.'),
  ('Bobcat','bobcat','heavy_equipment','US',82,88,'professional','https://www.bobcat.com','Chargeuses compactes.'),
  ('Genie','genie','rental_equipment','US',78,85,'professional','https://www.genielift.com','Plateformes élévatrices.'),
  ('Hertz Equipment','hertz-equipment','rental_equipment','US',70,80,'professional','https://www.hertzequip.com','Location d''équipement de chantier.'),
  -- HVAC
  ('Mitsubishi Electric','mitsubishi-electric','hvac','JP',92,94,'premium','https://www.mitsubishielectric.ca','Thermopompes et systèmes mini-split.'),
  ('Carrier','carrier','hvac','US',82,88,'premium','https://www.carrier.com','Climatisation et chauffage.'),
  ('Lennox','lennox','hvac','US',82,88,'premium','https://www.lennox.com','Systèmes CVAC haut de gamme.'),
  ('Daikin','daikin','hvac','JP',88,92,'premium','https://www.daikin.com','Climatisation et thermopompes.'),
  ('Trane','trane','hvac','US',85,90,'premium','https://www.trane.com','Systèmes CVAC commerciaux et résidentiels.'),
  -- Electrical
  ('Schneider Electric','schneider-electric','electrical','FR',88,92,'premium','https://www.se.com','Distribution électrique et automatisation.'),
  ('Square D','square-d','electrical','US',82,88,'professional','https://www.se.com/ca/en/brands/square-d/','Panneaux et disjoncteurs.'),
  ('Eaton','eaton','electrical','US',82,86,'professional','https://www.eaton.com','Solutions électriques.'),
  ('Generac','generac','electrical','US',80,85,'premium','https://www.generac.com','Génératrices résidentielles et commerciales.'),
  ('Leviton','leviton','electrical','US',75,82,'mainstream','https://www.leviton.com','Dispositifs de câblage.'),
  -- Plumbing
  ('Kohler','kohler','plumbing','US',88,92,'luxury','https://www.kohler.ca','Robinetterie et appareils sanitaires.'),
  ('Moen','moen','plumbing','US',78,86,'premium','https://www.moen.ca','Robinets et accessoires de salle de bain.'),
  ('Delta Faucet','delta-faucet','plumbing','US',75,84,'premium','https://www.deltafaucet.ca','Robinetterie résidentielle.'),
  ('Grohe','grohe','plumbing','DE',90,92,'luxury','https://www.grohe.ca','Robinetterie premium allemande.'),
  ('Toto','toto','plumbing','JP',92,94,'luxury','https://www.totousa.com','Toilettes et appareils sanitaires haut de gamme.'),
  ('Uponor','uponor','plumbing','FI',85,90,'premium','https://www.uponor.com','PEX et plancher chauffant.'),
  -- Waterproofing / tile
  ('Schluter Systems','schluter','waterproofing','CA',90,94,'premium','https://www.schluter.com','Profilés et systèmes pour céramique.'),
  ('Mapei','mapei','waterproofing','IT',85,90,'premium','https://www.mapei.com','Adhésifs, coulis et imperméabilisation.'),
  ('Laticrete','laticrete','waterproofing','US',85,90,'premium','https://laticrete.com','Systèmes d''installation de céramique.'),
  -- Paint
  ('Benjamin Moore','benjamin-moore','paint_coatings','US',88,92,'premium','https://www.benjaminmoore.com','Peinture haut de gamme.'),
  ('Sherwin-Williams','sherwin-williams','paint_coatings','US',82,88,'premium','https://www.sherwin-williams.com','Peintures et revêtements.'),
  ('Sico','sico','paint_coatings','CA',75,82,'mainstream','https://www.sico.ca','Peinture canadienne (PPG).'),
  -- Cabinetry
  ('Cuisines Laurier','cuisines-laurier','cabinetry','CA',85,88,'premium','https://www.cuisineslaurier.com','Armoires de cuisine québécoises.'),
  ('Armoires AyA','aya-kitchens','cabinetry','CA',78,84,'premium','https://www.ayakitchens.com','Armoires personnalisées.'),
  -- Suppliers / fasteners
  ('Simpson Strong-Tie','simpson-strong-tie','fasteners','US',92,94,'professional','https://www.strongtie.com','Connecteurs structuraux.'),
  ('GRK Fasteners','grk','fasteners','CA',85,90,'professional','https://www.grkfasteners.com','Vis structurales premium.'),
  -- Flooring
  ('Mirage','mirage','flooring','CA',90,92,'premium','https://www.miragefloors.com','Planchers de bois franc québécois.'),
  ('Preverco','preverco','flooring','CA',85,88,'premium','https://www.preverco.com','Bois franc préfinis.'),
  ('Mohawk','mohawk','flooring','US',75,82,'mainstream','https://www.mohawkflooring.com','Tapis et planchers.'),
  -- Specialty
  ('Velux Solar','velux-solar','windows_doors','DK',88,90,'premium','https://www.velux.com','Puits de lumière solaires.'),
  ('Henry','henry','waterproofing','US',75,82,'professional','https://www.henry.com','Imperméabilisation et adhésifs de toiture.')
ON CONFLICT (slug) DO NOTHING;

-- Seed primary aliases from brand names
INSERT INTO public.brand_aliases (brand_id, alias, alias_normalized, is_primary)
SELECT id, name, lower(regexp_replace(name,'[^a-zA-Z0-9]+','','g')), true FROM public.brands
ON CONFLICT DO NOTHING;
