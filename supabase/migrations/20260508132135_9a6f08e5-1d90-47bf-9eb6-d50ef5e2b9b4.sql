
-- Allow public read access to contractors that have a published AIPP page,
-- and the related services & media so the public AIPP page can render.
CREATE POLICY "Public reads contractors with published page"
ON public.acq_contractors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.acq_aipp_pages p
    WHERE p.contractor_id = acq_contractors.id
      AND p.page_status = 'published'
  )
);

CREATE POLICY "Public reads scores of published contractors"
ON public.acq_contractor_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.acq_aipp_pages p
    WHERE p.contractor_id = acq_contractor_scores.contractor_id
      AND p.page_status = 'published'
  )
);

CREATE POLICY "Public reads services of published contractors"
ON public.acq_contractor_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.acq_aipp_pages p
    WHERE p.contractor_id = acq_contractor_services.contractor_id
      AND p.page_status = 'published'
  )
);

CREATE POLICY "Public reads media of published contractors"
ON public.acq_contractor_media
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.acq_aipp_pages p
    WHERE p.contractor_id = acq_contractor_media.contractor_id
      AND p.page_status = 'published'
  )
);
