UPDATE public.contractor_pricing_quotes q
SET contractor_id = c.id, updated_at = now()
FROM public.contractors c
WHERE q.contractor_id IS NULL AND q.user_id IS NOT NULL AND c.user_id = q.user_id
  AND (SELECT count(*) FROM public.contractors c2 WHERE c2.user_id = q.user_id) = 1;