
-- Extend outbound_replies for inbound webhook ingestion
ALTER TABLE public.outbound_replies
  ADD COLUMN IF NOT EXISTS from_email text,
  ADD COLUMN IF NOT EXISTS to_email text,
  ADD COLUMN IF NOT EXISTS message_id_header text,
  ADD COLUMN IF NOT EXISTS in_reply_to_header text,
  ADD COLUMN IF NOT EXISTS raw_payload jsonb,
  ADD COLUMN IF NOT EXISTS classification_confidence numeric,
  ADD COLUMN IF NOT EXISTS auto_action_taken text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_id uuid,
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS received_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_outbound_replies_from_email ON public.outbound_replies(from_email);
CREATE INDEX IF NOT EXISTS idx_outbound_replies_in_reply_to ON public.outbound_replies(in_reply_to_header);
CREATE INDEX IF NOT EXISTS idx_outbound_replies_handled ON public.outbound_replies(handled, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_outbound_replies_intent ON public.outbound_replies(reply_intent);

-- Service role must always be able to insert (webhook runs without user)
GRANT SELECT, INSERT, UPDATE ON public.outbound_replies TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.outbound_replies TO authenticated;
