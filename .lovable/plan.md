
## Diagnostic

L'edge function `google-places-autocomplete` répond bien (200), mais Google retourne **0 prédiction** systématiquement — même avec une adresse claire. Le code actuel ignore complètement le `status` de Google (REQUEST_DENIED, OVER_QUERY_LIMIT, API not enabled, etc.) et renvoie `predictions: []` comme si tout allait bien. C'est pour ça que l'UI affiche "Sélectionnez une adresse dans la liste" sans jamais montrer de liste.

Causes probables côté Google Cloud :
1. **Places API (legacy) non activée** sur le projet — c'est le cas le plus fréquent
2. **Restriction de clé** (HTTP referrer / IP) qui bloque les appels serveur
3. **Facturation non activée** sur le projet Google Cloud
4. **Mauvaise clé** dans le secret `GOOGLE_PLACES_API_KEY`

## Plan de correction

### 1. Rendre l'edge function bavarde (debug + erreurs propres)
- Logger le `status` et `error_message` de Google côté serveur
- Si `status !== "OK"` ET `status !== "ZERO_RESULTS"` → renvoyer `{ predictions: [], error: status, message: error_message }` avec status HTTP 200 pour que le client puisse afficher l'erreur
- Ajouter un mode debug : si `?debug=1`, retourner aussi l'URL Google appelée (sans la clé)

### 2. Afficher l'erreur dans l'UI
- `useAddressAutocomplete` : capturer le champ `error` retourné et l'exposer
- `AddressVerifiedInput` : si erreur Google (ex. `REQUEST_DENIED`), afficher un message clair sous le champ : "Service d'adresse temporairement indisponible — contactez l'équipe" + un bouton "Saisir manuellement" comme fallback de secours

### 3. Vérifier le secret
- Confirmer que `GOOGLE_PLACES_API_KEY` existe bien dans les secrets de l'edge function
- Si manquant ou invalide, demander à l'utilisateur de le (re)configurer

### 4. (Recommandation utilisateur, hors code)
Vérifier dans Google Cloud Console :
- **Places API** activée (et non Places API New si la clé est legacy)
- **Billing** actif
- **Key restrictions** : aucune restriction HTTP referrer (puisqu'on appelle depuis le serveur), ou ajouter l'IP des edge functions Supabase

### 5. Test end-to-end
Une fois l'edge function redéployée, retester via curl puis via l'UI mobile.

## Livrables
- `supabase/functions/google-places-autocomplete/index.ts` : check du `status`, propagation de l'erreur, logs
- `src/hooks/useAddressAutocomplete.ts` : exposer l'erreur Google
- `src/components/address/AddressVerifiedInput.tsx` : afficher l'erreur sous le champ
