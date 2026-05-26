# Débloquer la mission Isolation entretoits

## Diagnostic

Les 2 missions lancées montrent **0 sur tous les compteurs** et restent en `optimizing` parce que :

1. **Google Places API retourne 0 résultat** pour chaque ville (clé probablement non autorisée pour Places API, ou quota épuisé, ou query trop spécifique avec « isolation entretoit »).
2. **Firecrawl v2 fallback crash** avec `TypeError: items is not iterable` à la ligne 75. La réponse `v2/search` renvoie `data.web` comme **objet** `{results: [...]}` (pas un array directement).
3. Comme aucune `outbound_companies` n'est insérée, les triggers `mission_bump_scraped` ne s'exécutent jamais → tous les compteurs à 0.
4. L'orchestrator force `status = 'optimizing'` à la fin même si rien n'a été scrapé, masquant l'échec.

## Plan d'exécution

### Phase 1 — Fixer `mission-scrape-trade-cities`

- **Firecrawl v2 parsing** : extraire correctement `data.web?.results ?? data.web ?? data.data ?? []` et vérifier `Array.isArray` avant d'itérer.
- **Élargir la query Google Places** : essayer `"isolation entretoit"` ET `"isolation toiture"` ET `"entrepreneur isolation"` par ville (3 variantes, garder la première qui retourne > 0).
- **Logger explicitement** le nombre de résultats Places vs Firecrawl par ville pour qu'on voie où ça casse.
- **Capturer les erreurs scrape** dans `outbound_admin_alerts` ET dans une nouvelle colonne `last_error` sur `outbound_missions` (migration légère) pour les afficher dans Mission Control.

### Phase 2 — Fixer l'orchestrator

- Ne PAS forcer `status = 'optimizing'` à la fin. Calculer le vrai status :
  - `failed` si `scraped_count = 0`
  - `enriching` / `generating` / `sending` selon la dernière phase qui a inséré des données
  - `awaiting_payment` après envoi réussi
- Retourner le `trace` complet (statuts HTTP de chaque phase) au client pour debug immédiat.

### Phase 3 — Améliorer Mission Control UI

- Afficher `last_error` (badge rouge) sous le statut quand présent.
- Bouton **« Voir trace »** qui dump le résultat de l'orchestrator (déjà loggé en console).
- Bouton **« Test scrape (1 ville) »** pour itérer rapidement sans relancer tout le pipeline.

### Phase 4 — Vérification live

- Relancer la mission existante via `Run full pipeline`.
- Vérifier dans `outbound_companies` que les rows sont insérées avec `mission_id`.
- Confirmer `scraped_count > 0` dans `outbound_missions`.
- Si Google Places retourne toujours 0, demander à l'utilisateur de vérifier que **Places API (legacy textsearch)** est activée sur la clé GCP — la nouvelle Places API v1 requiert un endpoint différent (`places:searchText`).

## Section technique

**Fichiers modifiés :**
- `supabase/functions/mission-scrape-trade-cities/index.ts` — fix Firecrawl parsing, multi-query Places, error capture
- `supabase/functions/mission-orchestrator/index.ts` — status calculé, trace exposé
- `src/pages/admin/PageMissionControl.tsx` — affichage erreur + bouton test
- Migration : `ALTER TABLE outbound_missions ADD COLUMN last_error jsonb`

**Hors scope (ce tour) :** activation d'une nouvelle Places API v1, ajout d'un autre provider de scraping (Pages Jaunes, etc.). Si Places reste à 0 après le fix Firecrawl, on traitera dans le prochain tour.

## Succès

- `scraped_count >= 10` sur la prochaine run
- `enriched_count > 0` derrière
- Si une phase échoue, l'erreur est visible dans Mission Control en 1 clic
- Status reflète la réalité (jamais `optimizing` quand rien n'a été fait)
