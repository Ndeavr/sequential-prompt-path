"""Builds a throwaway local schema from migration 0044 section B (synthetic only; never point at a hosted DB)."""
s = open("drizzle/migrations/0044_checkout_reservation_and_historical_right_provenance.sql").read()
body = s[s.index("-- B) Réservation atomique"):s.index("-- C) Date d")].replace("public.has_role(auth.uid(), 'admin')", "false")
stub = """
CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE anon;
CREATE TABLE public.contractor_activation_ledger (id serial, contractor_id uuid, action text, source text, metadata jsonb default '{}', created_at timestamptz default now());
CREATE TABLE public.presence_valid (contractor_id uuid primary key);
CREATE FUNCTION public.annual_presence_status(_c uuid, _t boolean) RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('valid', EXISTS (SELECT 1 FROM public.presence_valid WHERE contractor_id=_c)) $$;
"""
open("schema.sql", "w").write(stub + body)
