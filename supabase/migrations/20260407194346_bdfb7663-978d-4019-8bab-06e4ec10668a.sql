-- Add publication and readiness flags to contractors
ALTER TABLE public.contractors
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_discoverable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_accepting_appointments boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

-- Add activation_source to contractor_subscriptions
ALTER TABLE public.contractor_subscriptions
  ADD COLUMN IF NOT EXISTS activation_source text DEFAULT 'self_service';

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_contractors_is_published ON public.contractors (is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_contractors_is_accepting ON public.contractors (is_accepting_appointments) WHERE is_accepting_appointments = true;