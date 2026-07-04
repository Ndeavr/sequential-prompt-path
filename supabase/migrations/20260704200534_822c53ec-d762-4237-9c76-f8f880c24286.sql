
-- Homeowner addresses (Google Places or manual)
CREATE TABLE IF NOT EXISTS public.homeowner_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_id uuid NOT NULL,
  label text,
  full_address text NOT NULL,
  street_number text,
  route text,
  city text NOT NULL,
  province text DEFAULT 'QC',
  postal_code text,
  country text DEFAULT 'Canada',
  google_place_id text,
  lat numeric,
  lng numeric,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homeowner_addresses TO authenticated;
GRANT ALL ON public.homeowner_addresses TO service_role;
ALTER TABLE public.homeowner_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_addresses_all" ON public.homeowner_addresses
  FOR ALL USING (auth.uid() = homeowner_id) WITH CHECK (auth.uid() = homeowner_id);
CREATE INDEX IF NOT EXISTS idx_homeowner_addresses_homeowner ON public.homeowner_addresses(homeowner_id);

-- Contractor calendar connections
CREATE TABLE IF NOT EXISTS public.contractor_calendar_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'google',
  google_calendar_id text,
  access_status text NOT NULL DEFAULT 'not_connected',
  last_synced_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.contractor_calendar_connections TO anon, authenticated;
GRANT ALL ON public.contractor_calendar_connections TO service_role;
ALTER TABLE public.contractor_calendar_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cal_conn_public_read" ON public.contractor_calendar_connections FOR SELECT USING (true);
CREATE INDEX IF NOT EXISTS idx_cal_conn_contractor ON public.contractor_calendar_connections(contractor_id);

-- Appointment slots (available times published by contractor / synced from Google)
CREATE TABLE IF NOT EXISTS public.appointment_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'available',
  source text NOT NULL DEFAULT 'manual',
  held_by uuid,
  held_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.appointment_slots TO anon, authenticated;
GRANT UPDATE ON public.appointment_slots TO authenticated;
GRANT ALL ON public.appointment_slots TO service_role;
ALTER TABLE public.appointment_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots_public_read" ON public.appointment_slots FOR SELECT USING (true);
CREATE POLICY "slots_hold_by_auth" ON public.appointment_slots FOR UPDATE TO authenticated
  USING (status IN ('available','held')) WITH CHECK (status IN ('available','held','booked'));
CREATE INDEX IF NOT EXISTS idx_slots_contractor_time ON public.appointment_slots(contractor_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_slots_status ON public.appointment_slots(status);

-- Extend appointments to link address + slot
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS address_id uuid REFERENCES public.homeowner_addresses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS slot_id uuid REFERENCES public.appointment_slots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS google_event_id text,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS problem_summary text,
  ADD COLUMN IF NOT EXISTS source_page text;

-- Allow authenticated homeowners to insert their own appointment rows
DROP POLICY IF EXISTS "homeowner_can_insert_own_appointment" ON public.appointments;
CREATE POLICY "homeowner_can_insert_own_appointment" ON public.appointments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = homeowner_user_id);

DROP POLICY IF EXISTS "homeowner_can_read_own_appointment" ON public.appointments;
CREATE POLICY "homeowner_can_read_own_appointment" ON public.appointments
  FOR SELECT TO authenticated
  USING (auth.uid() = homeowner_user_id);
