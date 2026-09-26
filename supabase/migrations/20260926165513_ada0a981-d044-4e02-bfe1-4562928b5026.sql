DO $$
DECLARE v_id uuid; s text;
BEGIN
  SELECT id INTO v_id FROM public.appointments WHERE source_page = 'admin_qa_pipeline' ORDER BY created_at DESC LIMIT 1;
  FOREACH s IN ARRAY ARRAY['under_review','accepted','scheduled','confirmed','paid','activated','out_of_area','bad_match','callback_needed','declined','confirmed'] LOOP
    UPDATE public.appointments SET status = s::appointment_status WHERE id = v_id;
  END LOOP;
END $$;