
-- =============================================
-- UNPRO Smart Booking Engine V2 — Phase 1 Schema
-- =============================================

-- 1. Extend contractors with booking settings
ALTER TABLE public.contractors
ADD COLUMN IF NOT EXISTS booking_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS booking_page_published boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS booking_timezone text DEFAULT 'America/Toronto',
ADD COLUMN IF NOT EXISTS booking_base_lat double precision,
ADD COLUMN IF NOT EXISTS booking_base_lng double precision,
ADD COLUMN IF NOT EXISTS booking_service_radius_km integer DEFAULT 50,
ADD COLUMN IF NOT EXISTS booking_default_rounding_minutes integer DEFAULT 15,
ADD COLUMN IF NOT EXISTS booking_min_notice_hours integer DEFAULT 4,
ADD COLUMN IF NOT EXISTS booking_horizon_days integer DEFAULT 30,
ADD COLUMN IF NOT EXISTS booking_mode text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS google_calendar_connected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS google_calendar_id text;

-- 2. Booking appointment types
CREATE TABLE public.booking_appointment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  category text DEFAULT 'general',
  short_description text,
  long_description text,
  duration_minutes integer NOT NULL DEFAULT 90,
  buffer_before_minutes integer DEFAULT 0,
  buffer_after_minutes integer DEFAULT 15,
  travel_padding_minutes integer DEFAULT 15,
  color text DEFAULT '#3B82F6',
  icon text DEFAULT 'calendar',
  price_type text DEFAULT 'free',
  price_amount integer DEFAULT 0,
  is_free boolean DEFAULT true,
  location_mode text DEFAULT 'client_address',
  availability_mode text DEFAULT 'standard',
  requires_photos boolean DEFAULT false,
  requires_documents boolean DEFAULT false,
  requires_prequalification boolean DEFAULT false,
  requires_deposit boolean DEFAULT false,
  requires_manual_approval boolean DEFAULT false,
  supports_alex_booking boolean DEFAULT true,
  supports_qr_booking boolean DEFAULT true,
  allows_same_day boolean DEFAULT false,
  min_notice_hours integer DEFAULT 4,
  max_daily_count integer DEFAULT 5,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, slug)
);

-- 3. Weekly availability
CREATE TABLE public.booking_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL DEFAULT '08:00',
  end_time time NOT NULL DEFAULT '17:00',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, day_of_week)
);

-- 4. Blackout periods
CREATE TABLE public.booking_blackouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  reason text,
  source text DEFAULT 'manual',
  created_at timestamptz DEFAULT now()
);

-- 5. Smart bookings
CREATE TABLE public.smart_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  appointment_type_id uuid REFERENCES public.booking_appointment_types(id),
  source text DEFAULT 'direct',
  source_detail text,
  source_campaign text,
  qr_id text,
  alex_session_id text,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  address_line1 text,
  city text,
  province text DEFAULT 'QC',
  postal_code text,
  lat double precision,
  lng double precision,
  property_type text,
  urgency_level text DEFAULT 'normal',
  requested_notes text,
  internal_summary text,
  status text DEFAULT 'pending',
  scheduled_start timestamptz NOT NULL,
  scheduled_end timestamptz NOT NULL,
  travel_minutes_before integer DEFAULT 0,
  travel_minutes_after integer DEFAULT 0,
  buffer_before_minutes integer DEFAULT 0,
  buffer_after_minutes integer DEFAULT 15,
  appointment_quality_score numeric DEFAULT 0,
  booking_rank_score numeric DEFAULT 0,
  dna_match_score numeric DEFAULT 0,
  close_probability_score numeric DEFAULT 0,
  estimated_job_value integer DEFAULT 0,
  google_calendar_event_id text,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. Booking files
CREATE TABLE public.booking_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.smart_bookings(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_type text DEFAULT 'photo',
  file_label text,
  created_at timestamptz DEFAULT now()
);

-- 7. Booking links & QR
CREATE TABLE public.booking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  appointment_type_id uuid REFERENCES public.booking_appointment_types(id),
  slug text NOT NULL,
  title text,
  source_tag text,
  city text,
  service text,
  alex_mode boolean DEFAULT false,
  qr_code_url text,
  is_active boolean DEFAULT true,
  scan_count integer DEFAULT 0,
  booking_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, slug)
);

-- 8. Intake answers
CREATE TABLE public.booking_intake_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.smart_bookings(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  field_value jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 9. Travel cache
CREATE TABLE public.booking_travel_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_hash text NOT NULL,
  destination_hash text NOT NULL,
  duration_minutes integer NOT NULL,
  distance_meters integer,
  traffic_mode text DEFAULT 'best_guess',
  created_at timestamptz DEFAULT now(),
  UNIQUE(origin_hash, destination_hash, traffic_mode)
);

-- 10. Calendar integrations
CREATE TABLE public.booking_calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  provider text DEFAULT 'google',
  selected_calendar_id text,
  sync_read_busy boolean DEFAULT true,
  sync_write_events boolean DEFAULT true,
  status text DEFAULT 'disconnected',
  metadata_secure jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(contractor_id, provider)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_booking_types_contractor ON public.booking_appointment_types(contractor_id);
CREATE INDEX IF NOT EXISTS idx_booking_availability_contractor ON public.booking_availability(contractor_id);
CREATE INDEX IF NOT EXISTS idx_smart_bookings_contractor ON public.smart_bookings(contractor_id);
CREATE INDEX IF NOT EXISTS idx_smart_bookings_status ON public.smart_bookings(status);
CREATE INDEX IF NOT EXISTS idx_smart_bookings_scheduled ON public.smart_bookings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_booking_links_contractor ON public.booking_links(contractor_id);

-- RLS
ALTER TABLE public.booking_appointment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_intake_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_travel_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Public read for appointment types (active only)
CREATE POLICY "Anyone can view active appointment types"
  ON public.booking_appointment_types FOR SELECT
  USING (is_active = true);

-- Contractor manages own types
CREATE POLICY "Contractors manage own appointment types"
  ON public.booking_appointment_types FOR ALL
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Public read for availability
CREATE POLICY "Anyone can view active availability"
  ON public.booking_availability FOR SELECT
  USING (is_active = true);

-- Contractor manages own availability
CREATE POLICY "Contractors manage own availability"
  ON public.booking_availability FOR ALL
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Contractor manages blackouts
CREATE POLICY "Contractors manage own blackouts"
  ON public.booking_blackouts FOR ALL
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Anyone can create a booking (public booking page)
CREATE POLICY "Anyone can create bookings"
  ON public.smart_bookings FOR INSERT
  WITH CHECK (true);

-- Contractor views own bookings
CREATE POLICY "Contractors view own bookings"
  ON public.smart_bookings FOR SELECT
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Contractor updates own bookings
CREATE POLICY "Contractors update own bookings"
  ON public.smart_bookings FOR UPDATE
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Anyone can upload files with a booking
CREATE POLICY "Anyone can add booking files"
  ON public.booking_files FOR INSERT
  WITH CHECK (true);

-- Contractor views booking files
CREATE POLICY "Contractors view booking files"
  ON public.booking_files FOR SELECT
  TO authenticated
  USING (booking_id IN (SELECT id FROM public.smart_bookings WHERE contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid())) OR public.has_role(auth.uid(), 'admin'));

-- Public read for booking links
CREATE POLICY "Anyone can view active booking links"
  ON public.booking_links FOR SELECT
  USING (is_active = true);

-- Contractor manages booking links
CREATE POLICY "Contractors manage own booking links"
  ON public.booking_links FOR ALL
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Anyone can add intake answers
CREATE POLICY "Anyone can add intake answers"
  ON public.booking_intake_answers FOR INSERT
  WITH CHECK (true);

-- Travel cache public read
CREATE POLICY "Anyone can read travel cache"
  ON public.booking_travel_cache FOR SELECT
  USING (true);

-- Travel cache insert for service
CREATE POLICY "Service can write travel cache"
  ON public.booking_travel_cache FOR INSERT
  WITH CHECK (true);

-- Calendar integrations - contractor only
CREATE POLICY "Contractors manage calendar integrations"
  ON public.booking_calendar_integrations FOR ALL
  TO authenticated
  USING (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()))
  WITH CHECK (contractor_id IN (SELECT id FROM public.contractors WHERE user_id = auth.uid()));

-- Admin access for all booking tables
CREATE POLICY "Admins full access appointment types"
  ON public.booking_appointment_types FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access availability"
  ON public.booking_availability FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access blackouts"
  ON public.booking_blackouts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access bookings"
  ON public.smart_bookings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access booking files"
  ON public.booking_files FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access booking links"
  ON public.booking_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access intake"
  ON public.booking_intake_answers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins full access calendar"
  ON public.booking_calendar_integrations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at triggers
CREATE TRIGGER set_updated_at_booking_types BEFORE UPDATE ON public.booking_appointment_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_smart_bookings BEFORE UPDATE ON public.smart_bookings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_calendar_integrations BEFORE UPDATE ON public.booking_calendar_integrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
