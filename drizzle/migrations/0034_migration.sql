CREATE OR REPLACE FUNCTION public.portfolio_property_owner_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') AND NOT EXISTS (
    SELECT 1 FROM properties pr JOIN portfolios p ON p.id = NEW.portfolio_id
    WHERE pr.id = NEW.property_id AND pr.user_id = auth.uid() AND p.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Propriété ou portefeuille non autorisé.';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER portfolio_properties_owner_guard BEFORE INSERT OR UPDATE ON public.portfolio_properties
FOR EACH ROW EXECUTE FUNCTION public.portfolio_property_owner_guard();