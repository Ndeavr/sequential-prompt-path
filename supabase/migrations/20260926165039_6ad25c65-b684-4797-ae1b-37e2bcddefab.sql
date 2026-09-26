ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'paid';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'activated';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'out_of_area';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'bad_match';
ALTER TYPE public.appointment_status ADD VALUE IF NOT EXISTS 'callback_needed';