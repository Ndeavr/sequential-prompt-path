-- STAGED: apply only after explicit owner approval.
-- Removes anonymous read of the shared guest/ folder in private bucket painting-photos.
-- Guest upload stays allowed; analysis signs URLs server-side (staged index.ts).
DROP POLICY IF EXISTS "Public can read guest painting photos" ON storage.objects;
