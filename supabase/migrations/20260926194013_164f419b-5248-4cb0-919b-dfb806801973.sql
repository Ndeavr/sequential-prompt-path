-- Publication automatique après activation gratuite (12 mois) + garantie de slug public.
-- Pourquoi: l'activation gratuite marquait le compte actif sans jamais rendre la fiche
-- publique, contrairement au parcours payant. Une fiche non publiée ne peut pas recevoir
-- de rendez-vous ni être trouvée, ce qui casse la promesse de l'offre gratuite.

CREATE OR REPLACE FUNCTION public.ensure_contractor_public_slug(_contractor_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row record;
  v_base text;
  v_slug text;
BEGIN
  SELECT id, business_name, slug INTO v_row
  FROM public.contractors WHERE id = _contractor_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF nullif(btrim(coalesce(v_row.slug, '')), '') IS NOT NULL THEN
    RETURN v_row.slug;
  END IF;

  v_base := nullif(btrim(public.unpro_slugify(coalesce(v_row.business_name, ''))), '');
  IF v_base IS NULL THEN
    v_base := 'pro';
  END IF;

  v_slug := left(v_base, 48) || '-' || left(replace(_contractor_id::text, '-', ''), 6);

  -- collision improbable, mais on la traite quand même
  WHILE EXISTS (SELECT 1 FROM public.contractors WHERE slug = v_slug AND id <> _contractor_id) LOOP
    v_slug := left(v_base, 42) || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8);
  END LOOP;

  UPDATE public.contractors SET slug = v_slug, updated_at = now() WHERE id = _contractor_id;
  RETURN v_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_contractor_on_free_activation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_contractor_id uuid;
BEGIN
  IF NEW.status NOT IN ('founder_activated', 'first_referral', 'renewal_due', 'renewed') THEN
    RETURN NEW;
  END IF;

  v_contractor_id := NEW.contractor_id;

  IF v_contractor_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT id INTO v_contractor_id
    FROM public.contractors
    WHERE user_id = NEW.user_id
    ORDER BY created_at
    LIMIT 1;
  END IF;

  IF v_contractor_id IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM public.ensure_contractor_public_slug(v_contractor_id);

  UPDATE public.contractors
  SET account_status = 'active',
      activation_status = 'active',
      is_published = true,
      is_discoverable = true,
      is_accepting_appointments = true,
      updated_at = now()
  WHERE id = v_contractor_id
    AND coalesce(is_published, false) = false;

  BEGIN
    INSERT INTO public.contractor_activation_ledger (contractor_id, action, reason, metadata)
    VALUES (
      v_contractor_id,
      'free_year_activated',
      'Publication automatique après activation 12 mois gratuits',
      jsonb_build_object('membership_id', NEW.id, 'city', NEW.city, 'category_slug', NEW.category_slug)
    );
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_publish_contractor_on_free_activation ON public.founder_memberships;
CREATE TRIGGER trg_publish_contractor_on_free_activation
AFTER INSERT OR UPDATE OF status, contractor_id, user_id ON public.founder_memberships
FOR EACH ROW EXECUTE FUNCTION public.publish_contractor_on_free_activation();

-- Backfill: slug manquant sur les fiches déjà publiées (URL publique inaccessible sinon)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.contractors WHERE coalesce(is_published,false) = true AND nullif(btrim(coalesce(slug,'')),'') IS NULL LOOP
    PERFORM public.ensure_contractor_public_slug(r.id);
  END LOOP;
END $$;