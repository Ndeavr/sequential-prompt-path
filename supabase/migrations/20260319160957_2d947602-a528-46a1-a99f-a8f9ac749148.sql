
-- Add matching lifecycle columns to leads
ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS matching_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS assigned_match_id uuid;

-- Add response lifecycle columns to matches  
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS response_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS responded_at timestamptz;
