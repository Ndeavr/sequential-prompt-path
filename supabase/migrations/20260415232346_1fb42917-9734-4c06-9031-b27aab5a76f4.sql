
-- billing_checkout_sessions
CREATE TABLE IF NOT EXISTS public.billing_checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  stripe_checkout_session_id text UNIQUE,
  stripe_customer_id text,
  amount_total integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'cad',
  checkout_status text NOT NULL DEFAULT 'open',
  payment_status text NOT NULL DEFAULT 'unpaid',
  plan_code text,
  coupon_code text,
  metadata_json jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.billing_checkout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage billing_checkout_sessions" ON public.billing_checkout_sessions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- billing_webhook_events
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  livemode boolean DEFAULT false,
  delivery_status text NOT NULL DEFAULT 'received',
  payload_json jsonb DEFAULT '{}',
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage billing_webhook_events" ON public.billing_webhook_events FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- contractor_import_snapshots
CREATE TABLE IF NOT EXISTS public.contractor_import_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid REFERENCES public.contractors(id) ON DELETE SET NULL,
  business_name text NOT NULL,
  domain text,
  category text,
  import_source text DEFAULT 'admin_manual',
  snapshot_json jsonb DEFAULT '{}',
  verification_status text DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.contractor_import_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage contractor_import_snapshots" ON public.contractor_import_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime on webhook events for live tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_webhook_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.billing_checkout_sessions;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_billing_checkout_sessions_contractor ON public.billing_checkout_sessions(contractor_id);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_type ON public.billing_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_webhook_events_received ON public.billing_webhook_events(received_at DESC);
