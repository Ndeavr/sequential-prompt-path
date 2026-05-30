# Brancher Google Places (connecteur Google Maps Platform)

Le connecteur Google Maps Platform vient d'être lié au projet — secrets disponibles côté edge: `LOVABLE_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_TRACKING_ID`. Tous les appels doivent passer par la gateway `https://connector-gateway.lovable.dev/google_maps/...` (pas d'appel direct à `googleapis.com`).

`STRIPE_WEBHOOK_SECRET` est déjà configuré → aucun changement code requis, juste re-run du health check.

## Changements

### 1. `supabase/functions/acq-health-check/index.ts`
Réécrire `pingGooglePlaces()`:
- Accepter le connecteur en priorité: si `LOVABLE_API_KEY` + `GOOGLE_MAPS_API_KEY` présents → ping `places/v1/places:searchText` via la gateway avec un payload minimal (`{textQuery:"test"}`) et le header `X-Goog-FieldMask: places.id`.
- Fallback: ancienne clé `GOOGLE_PLACES_API_KEY` (legacy) si quelqu'un l'a mise à la main.
- Sinon `missing`.
- Statut `connected` si HTTP 2xx, `invalid` si 401/403, `limited` si autre erreur.

### 2. `supabase/functions/acq-scrape-contractors/index.ts`
Remplacer les appels directs `maps.googleapis.com/maps/api/place/textsearch` et `place/details` par la **Places API (New)** via la gateway:
- `POST {GATEWAY}/places/v1/places:searchText` avec body `{textQuery, regionCode:"CA", languageCode:"fr"}`, headers `Authorization: Bearer ${LOVABLE_API_KEY}`, `X-Connection-Api-Key: ${GOOGLE_MAPS_API_KEY}`, `X-Goog-FieldMask: places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.googleMapsUri,places.rating,places.userRatingCount`.
- Plus besoin d'un second appel "details" — les champs sont retournés directement via le FieldMask.
- Mapper les nouveaux champs (`displayName.text`, `nationalPhoneNumber`, `websiteUri`, etc.) dans l'insert prospect existant.
- Garder le garde `requireService(s, "google_places")`.

### 3. `supabase/functions/autopilot-mvp/index.ts`
Mêmes changements: utiliser la gateway pour `places:searchText`. Remplacer le header `X-Goog-Api-Key` par `Authorization`+`X-Connection-Api-Key`+URL gateway. Garder le message de fallback en l'adaptant ("Vérifier le connecteur Google Maps Platform").

### 4. Re-run du health check
Pas de code: après déploiement, l'utilisateur clique "Run Full Pipeline Test" → `google_places` et `stripe_webhook` doivent passer `connected`.

## Hors scope
- Pas de changement UI.
- Pas de migration DB.
- Pas de touche au domaine custom (la warning du connecteur concerne le navigateur Maps JS — ici on n'utilise que des appels serveur via gateway, qui fonctionnent sur n'importe quel domaine).
