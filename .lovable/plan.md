## Cause de l'échec étape 10/14

L'étape 9 `click_tracked_cta` fait `fetch("https://unpro.ca/r/{trackerId}")`. Ce chemin est servi par le SPA React (`QrRedirectPage`) qui ne déclenche le tracking **que dans le navigateur** via `window.location.replace(...)`. Un `fetch` côté serveur reçoit simplement le HTML de la SPA (HTTP 200), donc l'edge function `r-redirect` n'est jamais invoquée et aucun event `clicked` n'est inséré dans `acquisition_events`. L'étape 10 échoue donc systématiquement.

## Correctif

Dans `supabase/functions/acq-e2e-real/index.ts`, taper directement l'edge function `r-redirect` pour l'étape 9 :

- Remplacer le `fetch` vers `https://unpro.ca/r/{trackerId}` par un appel à l'URL de la fonction : `${SUPABASE_URL}/functions/v1/r-redirect/{trackerId}` avec `redirect: "manual"` et header `Authorization: Bearer ${SERVICE_ROLE_KEY}`.
- Accepter `status === 302` (ou 3xx) comme succès ; échec sinon.
- Conserver le polling existant de l'étape 10 (4 × 1s) sur `acquisition_events` avec `event_type=clicked` + `metadata.tracker_id`.

## Effet attendu

- Étape 9 : 302 vers `destination_url`.
- `r-redirect` insère la ligne `clicked` dans `acquisition_events` et incrémente `acquisition_tracking_links.click_count`.
- Étape 10 trouve l'event → passe.
- Messaging cap retombe à 100, Overall ≥ 95, Autopilot se déverrouille.

## Notes

Aucune modification UI, aucun changement de logique métier. Test E2E uniquement. Le comportement réel utilisateur (clic mobile/desktop sur `unpro.ca/r/...`) reste inchangé — le SPA continue de rediriger via `window.location.replace`.
