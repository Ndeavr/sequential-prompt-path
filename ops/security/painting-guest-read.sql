-- STAGED ONLY. Apply after the inline guest frontend is released and live
-- bucket/policies are inspected, with backup and authorized project confirmed.
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'painting-photos' AND public = false) THEN
    RAISE EXCEPTION 'Expected private painting-photos bucket; inspect before applying';
  END IF;
END $$;
DROP POLICY IF EXISTS "Public can read guest painting photos" ON storage.objects;
COMMIT;
-- Verify effective anon SELECT/signing deny, A/B isolation and owner/admin reads.
-- Existing signed URLs may remain usable until expiry: do not claim revocation.
