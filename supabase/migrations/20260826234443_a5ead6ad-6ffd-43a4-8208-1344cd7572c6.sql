
CREATE TABLE public.contractor_campaigns (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors(id) on delete cascade,
  contractor_slug text not null,
  intent_slug text not null,
  headline text not null,
  subheadline text,
  cta_label text not null default 'Obtenir mon rendez-vous',
  service_area text,
  bullets jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contractor_slug, intent_slug)
);
GRANT SELECT ON public.contractor_campaigns TO anon, authenticated;
GRANT ALL ON public.contractor_campaigns TO service_role;
ALTER TABLE public.contractor_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_public_read_active" ON public.contractor_campaigns FOR SELECT USING (active = true);
CREATE POLICY "campaigns_admin_all" ON public.contractor_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.campaign_attributions (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.contractor_campaigns(id) on delete set null,
  contractor_id uuid references public.contractors(id) on delete set null,
  contractor_slug text,
  intent_slug text,
  gclid text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_url text,
  referrer text,
  session_id text,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_campaign_attributions_campaign ON public.campaign_attributions(campaign_id, created_at desc);
GRANT INSERT ON public.campaign_attributions TO anon, authenticated;
GRANT SELECT ON public.campaign_attributions TO authenticated;
GRANT ALL ON public.campaign_attributions TO service_role;
ALTER TABLE public.campaign_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attrib_public_insert" ON public.campaign_attributions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "attrib_admin_read" ON public.campaign_attributions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
