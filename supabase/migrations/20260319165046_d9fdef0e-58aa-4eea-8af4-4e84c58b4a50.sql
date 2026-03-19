
-- Add new enum values for appointment_status
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'confirmed';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'reschedule_requested';

-- Extend appointments table
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS homeowner_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS contractor_confirmed boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS reschedule_reason text,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Create appointment_feedback table
CREATE TABLE IF NOT EXISTS public.appointment_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,
  homeowner_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  was_on_time boolean,
  was_professional boolean,
  would_recommend boolean,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (appointment_id)
);

-- Extend contractor_scores
ALTER TABLE public.contractor_scores
  ADD COLUMN IF NOT EXISTS appointments_completed integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS appointments_cancelled integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS on_time_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS recommendation_rate numeric(5,2);

-- Enable RLS on appointment_feedback
ALTER TABLE public.appointment_feedback ENABLE ROW LEVEL SECURITY;

-- RLS: select for related homeowner, contractor, or admin
CREATE POLICY "appointment_feedback_select_related_or_admin"
ON public.appointment_feedback
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR homeowner_profile_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = appointment_feedback.contractor_id
      AND c.user_id = auth.uid()
  )
);

-- RLS: insert for homeowner only (via edge function with service role, but allow direct too)
CREATE POLICY "appointment_feedback_insert_homeowner"
ON public.appointment_feedback
FOR INSERT
TO authenticated
WITH CHECK (homeowner_profile_id = auth.uid());

-- Indexes
CREATE INDEX IF NOT EXISTS idx_appointment_feedback_appointment ON public.appointment_feedback(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_feedback_contractor ON public.appointment_feedback(contractor_id);
