## Cause de l'échec étape 10/14

L'étape 9 appelle bien `r-redirect` qui insère un event `clicked` dans `acquisition_events` (vu dans `acq-e2e-real` après le fix précédent : status 302 OK, tracking column = trackerId).

L'étape 10 cherche cet event avec :

```ts
.eq("event_type", "clicked").contains("metadata", { tracker_id: trackerId })
```

Deux problèmes :

1. **Mauvaise colonne.** `acquisition_events` a une colonne dédiée `tracking_id` (cf. `_shared/acquisitionEvents.ts`). `r-redirect` y inscrit `trackingId` directement — pas dans `metadata`.
2. **Mauvaise clé.** Même si on cherchait dans metadata, le logger n'y met jamais `tracker_id`. Il met `user_agent`, `referer`, `campaign`.

Résultat : la requête ne matche jamais → `no clicked event recorded` → étape 10 FAIL → Messaging cap à 60 → Overall 60.

## Correctif

Dans `supabase/functions/acq-e2e-real/index.ts`, étape 10 (`verify_click_event`), remplacer le `.contains("metadata", { tracker_id })` par `.eq("tracking_id", trackerId)`.

```ts
const { data } = await sb.from("acquisition_events")
  .select("id,event_type")
  .eq("event_type", "clicked")
  .eq("tracking_id", trackerId)
  .limit(1);
```

Garder le polling 4 × 1s, déployer `acq-e2e-real`, relancer Run E2E (14).

## Effet attendu

- Étape 10 trouve l'event → PASS.
- Messaging cap retombe à 100, Overall ≥ 95, Autopilot se déverrouille.
- Aucune modification UI, aucun changement de logique métier ni de `r-redirect`.
