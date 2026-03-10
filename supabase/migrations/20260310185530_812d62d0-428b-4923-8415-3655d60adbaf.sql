
-- Create appointment status enum
CREATE TYPE public.appointment_status AS ENUM (
  'requested', 'under_review', 'accepted', 'declined', 'scheduled', 'completed', 'cancelled'
);

-- Create appointments table
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homeowner_user_id uuid NOT NULL,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  status public.appointment_status NOT NULL DEFAULT 'requested',
  preferred_date date,
  preferred_time_window text,
  scheduled_at timestamptz,
  contact_preference text DEFAULT 'email',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_appointments_homeowner ON public.appointments(homeowner_user_id);
CREATE INDEX idx_appointments_contractor ON public.appointments(contractor_id);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Updated_at trigger
CREATE TRIGGER set_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Homeowners can see their own appointments
CREATE POLICY "Homeowners can view own appointments"
  ON public.appointments FOR SELECT TO public
  USING (auth.uid() = homeowner_user_id);

-- Homeowners can create appointments
CREATE POLICY "Homeowners can create appointments"
  ON public.appointments FOR INSERT TO public
  WITH CHECK (auth.uid() = homeowner_user_id);

-- Homeowners can cancel their own appointments
CREATE POLICY "Homeowners can update own appointments"
  ON public.appointments FOR UPDATE TO public
  USING (auth.uid() = homeowner_user_id);

-- Contractors can view appointments linked to them
CREATE POLICY "Contractors can view assigned appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = appointments.contractor_id AND c.user_id = auth.uid()
    )
  );

-- Contractors can update status of their appointments
CREATE POLICY "Contractors can update assigned appointments"
  ON public.appointments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = appointments.contractor_id AND c.user_id = auth.uid()
    )
  );

-- Admin can view all appointments
CREATE POLICY "Admins can view all appointments"
  ON public.appointments FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Admin can manage all appointments
CREATE POLICY "Admins can manage all appointments"
  ON public.appointments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
