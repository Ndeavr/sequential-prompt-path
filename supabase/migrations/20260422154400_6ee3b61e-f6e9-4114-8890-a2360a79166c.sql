
-- Create contractor activation funnel table
CREATE TABLE public.contractor_activation_funnel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'solo',
  current_screen integer NOT NULL DEFAULT 1,
  business_name text,
  phone text,
  email text,
  website text,
  import_status text NOT NULL DEFAULT 'pending',
  imported_data jsonb NOT NULL DEFAULT '{}',
  aipp_score jsonb,
  checklist_state jsonb NOT NULL DEFAULT '{}',
  selected_services jsonb NOT NULL DEFAULT '[]',
  selected_zones jsonb NOT NULL DEFAULT '[]',
  media_uploads jsonb NOT NULL DEFAULT '[]',
  preferences jsonb NOT NULL DEFAULT '{}',
  calendar_connected boolean NOT NULL DEFAULT false,
  selected_plan text,
  billing_cycle text,
  stripe_session_id text,
  payment_status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookup by user
CREATE INDEX idx_caf_user_id ON public.contractor_activation_funnel(user_id);

-- Enable RLS
ALTER TABLE public.contractor_activation_funnel ENABLE ROW LEVEL SECURITY;

-- Users can view their own funnel rows
CREATE POLICY "Users can view own funnel"
  ON public.contractor_activation_funnel FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own funnel rows
CREATE POLICY "Users can create own funnel"
  ON public.contractor_activation_funnel FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own funnel rows
CREATE POLICY "Users can update own funnel"
  ON public.contractor_activation_funnel FOR UPDATE
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE TRIGGER update_caf_updated_at
  BEFORE UPDATE ON public.contractor_activation_funnel
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for contractor media
INSERT INTO storage.buckets (id, name, public) VALUES ('contractor-media', 'contractor-media', true);

-- Public read access
CREATE POLICY "Public can view contractor media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contractor-media');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload own contractor media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'contractor-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can update their own media
CREATE POLICY "Users can update own contractor media"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'contractor-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Users can delete their own media
CREATE POLICY "Users can delete own contractor media"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'contractor-media' AND auth.uid()::text = (storage.foldername(name))[1]);
