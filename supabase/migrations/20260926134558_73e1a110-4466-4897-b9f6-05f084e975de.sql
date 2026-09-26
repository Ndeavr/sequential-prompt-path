CREATE TABLE IF NOT EXISTS public.contractor_publication_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  old_published boolean, new_published boolean,
  old_discoverable boolean, new_discoverable boolean,
  old_account_status text, new_account_status text,
  db_role text, jwt_role text, jwt_sub text,
  query_excerpt text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_publication_audit TO authenticated;
GRANT ALL ON public.contractor_publication_audit TO service_role;
ALTER TABLE public.contractor_publication_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read publication audit" ON public.contractor_publication_audit
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.audit_contractor_publication()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_published IS DISTINCT FROM OLD.is_published
     OR NEW.is_discoverable IS DISTINCT FROM OLD.is_discoverable
     OR NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    INSERT INTO public.contractor_publication_audit(contractor_id, old_published, new_published,
      old_discoverable, new_discoverable, old_account_status, new_account_status,
      db_role, jwt_role, jwt_sub, query_excerpt)
    VALUES (NEW.id, OLD.is_published, NEW.is_published, OLD.is_discoverable, NEW.is_discoverable,
      OLD.account_status, NEW.account_status, current_user,
      current_setting('request.jwt.claim.role', true),
      current_setting('request.jwt.claim.sub', true),
      left(current_query(), 500));
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.audit_contractor_publication() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_audit_contractor_publication ON public.contractors;
CREATE TRIGGER trg_audit_contractor_publication AFTER UPDATE ON public.contractors
FOR EACH ROW EXECUTE FUNCTION public.audit_contractor_publication();