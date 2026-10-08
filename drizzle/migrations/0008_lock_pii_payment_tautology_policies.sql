-- Booking drafts: anon could read every phone/email
DROP POLICY IF EXISTS "Anon read drafts by session" ON public.alex_booking_drafts;

-- Recruitment leads: any signed-in user could read all phones
DROP POLICY IF EXISTS "Authenticated users can read recruitment leads" ON public.recruitment_leads;
CREATE POLICY "Admins read recruitment leads" ON public.recruitment_leads FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Business card imports: anon could read everyone's imports
DROP POLICY IF EXISTS "Anon can read imports" ON public.business_card_imports;

-- Messaging / tracking / pricing logs: admin-only reads, service-role writes
DROP POLICY IF EXISTS "Authenticated users read logs" ON public.sms_image_logs;
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.sms_image_logs;
CREATE POLICY "Admins read sms image logs" ON public.sms_image_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated users can read message events" ON public.message_events;
CREATE POLICY "Admins read message events" ON public.message_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated users can read click events" ON public.click_events;
CREATE POLICY "Admins read click events" ON public.click_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth_read_sms" ON public.evenements_sms;
DROP POLICY IF EXISTS "auth_insert_sms" ON public.evenements_sms;
CREATE POLICY "Admins read sms events" ON public.evenements_sms FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert sms events" ON public.evenements_sms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth_read_seq_emails" ON public.sequences_emails;
DROP POLICY IF EXISTS "auth_insert_seq_emails" ON public.sequences_emails;
CREATE POLICY "Admins read sequence emails" ON public.sequences_emails FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert sequence emails" ON public.sequences_emails FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated users can read pricing decisions" ON public.pricing_decisions;
DROP POLICY IF EXISTS "Authenticated users can create pricing decisions" ON public.pricing_decisions;
CREATE POLICY "Admins read pricing decisions" ON public.pricing_decisions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert pricing decisions" ON public.pricing_decisions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated users can read contractor_conversions" ON public.contractor_conversions;
DROP POLICY IF EXISTS "Authenticated users can insert contractor_conversions" ON public.contractor_conversions;
CREATE POLICY "Admins read contractor conversions" ON public.contractor_conversions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins insert contractor conversions" ON public.contractor_conversions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Scan IA reports: public read of all rows (incl. stripe_session_id) -> token-scoped RPC
DROP POLICY IF EXISTS "scan_reports_public_read" ON public.scan_ia_reports;
CREATE POLICY "Owners or admins read scan reports" ON public.scan_ia_reports FOR SELECT TO authenticated
  USING (claimed_by = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.get_scan_ia_report(_token text)
RETURNS SETOF public.scan_ia_reports
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM public.scan_ia_reports
  WHERE _token IS NOT NULL AND length(_token) >= 16 AND session_token = _token
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_scan_ia_report(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scan_ia_report(text) TO anon, authenticated;

-- Calendar connections: public read of every row -> boolean RPC + owner/admin read
DROP POLICY IF EXISTS "cal_conn_public_read" ON public.contractor_calendar_connections;
CREATE POLICY "Owners or admins read calendar connections" ON public.contractor_calendar_connections FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = contractor_id AND c.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.contractor_calendar_connected(_contractor_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.contractor_calendar_connections
                 WHERE contractor_id = _contractor_id AND access_status = 'connected')
$$;
REVOKE ALL ON FUNCTION public.contractor_calendar_connected(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contractor_calendar_connected(uuid) TO anon, authenticated;