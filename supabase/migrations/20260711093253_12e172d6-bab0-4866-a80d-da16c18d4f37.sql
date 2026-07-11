
DO $$
DECLARE
  cid uuid := '0abadcb7-3524-4db0-92ff-a73db8a443be';
  d date := (now() AT TIME ZONE 'America/Toronto')::date + 1;
  slot_start timestamptz;
  hours int[] := ARRAY[9, 11, 14, 16];
  h int;
  added int := 0;
BEGIN
  WHILE added < 24 LOOP
    IF EXTRACT(DOW FROM d) NOT IN (0, 6) THEN
      FOREACH h IN ARRAY hours LOOP
        slot_start := (d::text || ' ' || lpad(h::text,2,'0') || ':00:00')::timestamp AT TIME ZONE 'America/Toronto';
        IF slot_start > now() AND NOT EXISTS (
          SELECT 1 FROM public.appointment_slots
          WHERE contractor_id = cid AND starts_at = slot_start
        ) THEN
          INSERT INTO public.appointment_slots (contractor_id, starts_at, ends_at, status, source)
          VALUES (cid, slot_start, slot_start + interval '60 minutes', 'available', 'seed_direct_booking');
          added := added + 1;
          EXIT WHEN added >= 24;
        END IF;
      END LOOP;
    END IF;
    d := d + 1;
  END LOOP;
END$$;
