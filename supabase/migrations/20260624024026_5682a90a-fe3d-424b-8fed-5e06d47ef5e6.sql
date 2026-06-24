INSERT INTO public.acq_email_sequences (code, day_offset, subject, body_html, active)
VALUES
  ('master_email_1', 0, 'L''IA trouve-t-elle déjà votre entreprise?', '<p>Rendered by masterOutreachCopy.masterEmail1 — tracked CTA + reply OUI.</p>', true),
  ('master_email_followup_3d', 3, 'L''IA recommande-t-elle votre entreprise?', '<p>Rendered by masterOutreachCopy.masterEmailFollowup3d — tracked CTA + reply OUI.</p>', true),
  ('master_email_followup_7d', 7, 'Ce que l''IA dit de votre entreprise (en ce moment)', '<p>Rendered by masterOutreachCopy.masterEmailFollowup7d — tracked CTA + reply OUI.</p>', true)
ON CONFLICT (code) DO UPDATE
  SET subject = EXCLUDED.subject,
      day_offset = EXCLUDED.day_offset,
      active = true;