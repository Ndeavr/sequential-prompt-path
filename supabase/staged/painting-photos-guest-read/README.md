# painting-photos — correctif préparé (non appliqué)
Release order (each step needs owner approval):
1. Deploy `index.ts` here to `supabase/functions/analyze-painting-photo/` (accepts `storage_path`, keeps `image_url`).
2. Switch `src/features/paintingCalculator/services.ts`: guests upload to `guest/<uuid>/…` and send `storage_path` (no client signed URL); signed-in URL 1 h.
3. Apply `migration.sql`.
Never apply step 3 before 1–2: guest photo analysis would break.
