
-- Add lead-qualifying fields to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS urgency_level text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS budget_range text,
  ADD COLUMN IF NOT EXISTS timeline text,
  ADD COLUMN IF NOT EXISTS project_category text;

-- Create lead_qualifications table
CREATE TABLE public.lead_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  homeowner_user_id uuid NOT NULL,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  project_category text,
  city text,
  budget_range text,
  timeline text,
  urgency_level text DEFAULT 'normal',
  description_length_score integer DEFAULT 0,
  property_linked boolean DEFAULT false,
  documents_uploaded boolean DEFAULT false,
  quote_uploaded boolean DEFAULT false,
  homeowner_profile_completeness integer DEFAULT 0,
  score_factors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(appointment_id)
);

CREATE INDEX idx_lead_qual_contractor ON public.lead_qualifications(contractor_id);
CREATE INDEX idx_lead_qual_homeowner ON public.lead_qualifications(homeowner_user_id);
CREATE INDEX idx_lead_qual_score ON public.lead_qualifications(score DESC);

ALTER TABLE public.lead_qualifications ENABLE ROW LEVEL SECURITY;

-- Contractors see leads assigned to them
CREATE POLICY "Contractors can view own leads"
  ON public.lead_qualifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contractors c
      WHERE c.id = lead_qualifications.contractor_id AND c.user_id = auth.uid()
    )
  );

-- Homeowners see their own leads
CREATE POLICY "Homeowners can view own leads"
  ON public.lead_qualifications FOR SELECT TO public
  USING (auth.uid() = homeowner_user_id);

-- Homeowners can create leads (on appointment creation)
CREATE POLICY "Homeowners can create leads"
  ON public.lead_qualifications FOR INSERT TO public
  WITH CHECK (auth.uid() = homeowner_user_id);

-- Admin full access
CREATE POLICY "Admins can manage all leads"
  ON public.lead_qualifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
