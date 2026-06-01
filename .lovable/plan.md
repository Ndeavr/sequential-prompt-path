## Objectif

Remplacer le dédoublonnage binaire actuel (`source_record_id` OU `business_name+city` → skip) par un **moteur de confiance multi-signal** qui :
- ne bloque jamais l'enrichissement,
- distingue vrais doublons (HIGH ≥ 0.9), candidats à vérifier (MEDIUM 0.6–0.89), faux positifs (LOW < 0.6),
- met à jour les fiches existantes au lieu de jeter les données.

## 1. Schéma (migration unique)

**Table `contractor_prospects`** — nouveaux champs :
- `dedupe_confidence numeric(3,2)` (0.00 → 1.00, NULL pour les nouveaux non comparés)
- `dedupe_matched_id uuid` (référence vers le doublon HIGH si applicable)
- `dedupe_signals jsonb default '{}'` (détail des signaux ayant matché : `{place_id, rbq, domain, phone_city, address_name, fuzzy_name}`)
- `google_place_id text` (extrait de `source_record_id` mais explicite et indexé)
- `normalized_domain text` (généré côté edge : `acme.ca` quel que soit `https://www.acme.ca/`)
- `last_enriched_at timestamptz`
- `enrichment_count int default 0`

**Index** :
- `idx_cp_place_id (google_place_id)`
- `idx_cp_domain (normalized_domain)`
- `idx_cp_rbq (rbq) WHERE rbq IS NOT NULL` (déjà partiel ? sinon on l'ajoute)
- `idx_cp_phone_city (phone, city)`

**Enum statut d'ingestion** (nouvelle colonne `ingestion_status text` avec CHECK) :
- `inserted` — nouveau prospect, aucun match
- `possible_duplicate` — match MEDIUM, flag pour review
- `enriched_existing` — match HIGH, on a mis à jour la fiche existante
- `skipped_duplicate` — match HIGH ET aucune donnée nouvelle à apporter
- `failed_extraction` — payload Google/Firecrawl invalide

**Nouvelle table `prospect_dedupe_reviews`** (file de revue admin) :
- `id`, `new_payload jsonb`, `existing_prospect_id uuid`, `confidence numeric`, `signals jsonb`, `status text` (`pending|merged|rejected|kept_both`), `reviewed_by uuid`, `reviewed_at`, `created_at`
- RLS : `service_role ALL`, `authenticated SELECT/UPDATE` via `has_role(auth.uid(),'admin')`
- GRANTs explicites (anon = aucun)

## 2. Edge function — nouveau module partagé inline

Créer **`supabase/functions/_shared/dedupeEngine.ts`** (importé par `acq-scrape-google-places` et futurs scrapers) :

```ts
classifyDuplicate(candidate, supabase) → {
  confidence: number,
  matchedId: string | null,
  signals: Record<string, boolean>,
  band: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
}
```

**Règles de score** (max 1.0, on garde le plus haut signal HIGH s'il existe) :
| Signal | Poids | Band |
|---|---|---|
| `google_place_id` égal | 1.00 | HIGH |
| `rbq` égal (normalisé) | 1.00 | HIGH |
| `normalized_domain` égal | 0.95 | HIGH |
| `phone` normalisé E.164 + même `city` | 0.75 | MEDIUM |
| Adresse normalisée + Jaro-Winkler nom ≥ 0.85 | 0.70 | MEDIUM |
| Jaro-Winkler nom ≥ 0.92 seul | 0.45 | LOW |

Helpers : `normalizePhone`, `normalizeDomain` (strip www/proto/trailing slash, lowercase), `normalizeRbq` (digits only), `jaroWinkler` (implémentation ~30 lignes).

## 3. Refactor `acq-scrape-google-places/index.ts`

Remplacer la boucle d'insert actuelle par :

```text
pour chaque place:
  candidate = mapper(place)
  match = classifyDuplicate(candidate, supabase)

  si band === HIGH:
    → enrichir la fiche existante (merge non destructif : on n'écrase
      jamais une valeur humaine — voir Contractor Identity Resolution memo)
    → mettre à jour review_count, review_rating, raw_data.google_place,
      last_enriched_at, enrichment_count += 1
    → si au moins 1 champ changé: status = 'enriched_existing', sinon 'skipped_duplicate'

  sinon si band === MEDIUM:
    → INSERT candidate avec ingestion_status='possible_duplicate',
      dedupe_confidence, dedupe_matched_id, dedupe_signals
    → INSERT prospect_dedupe_reviews (status='pending')

  sinon (LOW ou NONE):
    → INSERT candidate avec ingestion_status='inserted',
      dedupe_confidence (peut être NULL ou le score LOW)
```

Toujours retourner par compteur dans la réponse :
```json
{ inserted, enriched_existing, possible_duplicate, skipped_duplicate, failed_extraction }
```

## 4. Cascade

`acq-cascade-scrape` : pas de changement de logique de match, mais on cascade Firecrawl sur **tous les IDs touchés** (inserted + enriched_existing + possible_duplicate) — plus seulement `inserted_ids`. Champ ajouté à la réponse de `acq-scrape-google-places` : `touched_ids: string[]`.

## 5. UI — file de revue admin

Nouvelle page **`/admin/acquisition/duplicates`** :
- Table : nom candidat ↔ nom existant, ville, signaux qui ont matché (chips), confiance, source
- Actions par ligne : **Fusionner** (merge dans existant, supprime le candidat), **Rejeter** (les garder séparés), **Conserver les deux** (clear flag)
- Compteur `Possible duplicates (N)` ajouté dans la sidebar de `PageAdminAcquisitionMachine`

Hook : `useDedupeReviewQueue()` calqué sur `useRecruitmentProspects`.

## 6. Garde-fous

- Enrichissement **jamais bloqué** par dedupe : même `skipped_duplicate` déclenche Firecrawl si `last_enriched_at` > 7 jours.
- Merge non destructif (cf. memo Contractor Identity Resolution) : on n'écrase ni `legal_name`, ni `owner_name`, ni `email`, ni `rbq` quand `verification_status` indique une saisie humaine validée.
- Backfill `normalized_domain` + `google_place_id` (depuis `source_record_id`) sur les ~98 lignes existantes via un script SQL inclus dans la migration.

## 7. Critères de succès

- Pour Plombier × Laval (les 4 actuels) : 2e run → `enriched_existing: 4, inserted: 0, possible_duplicate: 0`, et `last_enriched_at` mis à jour sur les 4.
- Insertion d'un faux concurrent (même nom, ville différente, autre téléphone) → `possible_duplicate` + apparaît dans `/admin/acquisition/duplicates`.
- Insertion d'un homonyme parfait avec RBQ différent → `inserted` (LOW confidence, pas de blocage).

## Tâches

1. Migration (schéma + grants + RLS + backfill)
2. `_shared/dedupeEngine.ts`
3. Refactor `acq-scrape-google-places`
4. Patch `acq-cascade-scrape` (touched_ids)
5. Hook `useDedupeReviewQueue` + page `/admin/acquisition/duplicates`
6. Lien sidebar + compteur dans `PageAdminAcquisitionMachine`
