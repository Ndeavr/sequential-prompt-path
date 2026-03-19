
-- Bloc 6: Match decisions table + lead/appointment columns

-- 1. Create match_decisions table
CREATE TABLE IF NOT EXISTS public.match_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK (decision IN ('accepted', 'declined')),
  decline_reason text,
  decline_code text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Add columns to leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assigned_contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_matched_at timestamptz,
  ADD COLUMN IF NOT EXISTS booked_at timestamptz;

-- 3. Add columns to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 4. Enable RLS on match_decisions
ALTER TABLE public.match_decisions ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy: select for related contractor, homeowner, or admin
CREATE POLICY "match_decisions_select_own"
ON public.match_decisions
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.contractors c
    WHERE c.id = match_decisions.contractor_id
      AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = match_decisions.lead_id
      AND l.owner_profile_id = auth.uid()
  )
);

-- 6. Index for performance
CREATE INDEX IF NOT EXISTS idx_match_decisions_match_id ON public.match_decisions(match_id);
CREATE INDEX IF NOT EXISTS idx_match_decisions_lead_id ON public.match_decisions(lead_id);
CREATE INDEX IF NOT EXISTS idx_match_decisions_contractor_id ON public.match_decisions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_contractor_id ON public.leads(assigned_contractor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments(lead_id);
