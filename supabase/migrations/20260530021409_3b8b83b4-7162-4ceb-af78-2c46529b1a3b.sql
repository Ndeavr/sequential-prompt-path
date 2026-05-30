ALTER TABLE public.qr_user_links
  ADD COLUMN IF NOT EXISTS qr_type text DEFAULT 'affiliate',
  ADD COLUMN IF NOT EXISTS label text;

CREATE INDEX IF NOT EXISTS idx_qr_user_links_active ON public.qr_user_links(user_id, is_active);