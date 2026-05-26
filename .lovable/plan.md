## Objectif

Éliminer le mode simulation. Chaque run doit produire des prospects RÉELS issus de Google Places + Firecrawl, sinon être bloqué avec une raison actionnable. Ajouter un agent de récupération automatique qui élargit la recherche jusqu'à obtenir des résultats réels.

## Diagnostic actuel

Dans `supabase/functions/autopilot-mvp/index.ts` :
- En dry_run, si `counts.scraped === 0`, le système génère 15 prospects simulés (`generateSimulatedProspects`) → c'est ce qui produit "Run lancé · 0 prospects scrappés" sans valeur réelle.
- `simulationMode`, `simulated_count`, `execution_mode = 'simulation'`, `is_simulated = true` polluent les vraies données.
- La requête Google Places utilise `${trade} ${city} Québec` sans variantes ni élargissement géographique.

## Plan d'exécution

### 1. Suppression totale de la simulation
Fichier : `supabase/functions/autopilot-mvp/index.ts`
- Supprimer `generateSimulatedProspects`, `SIM_NAMES`, `simulationMode`, `counts.simulated`, le champ `__simulated`.
- Supprimer la branche `dry_run → simulation`.
- Simplifier `validateTransition` : plus de fallback "simulated", uniquement `c.scraped > 0`.
- `dry_run` garde son sens : scrape + enrich + score + personalize RÉELS, mais aucun email envoyé.

### 2. Nouvel agent de récupération `autopilot-recovery-agent`
Nouveau fichier : `supabase/functions/autopilot-recovery-agent/index.ts`
- Invoqué automatiquement par `autopilot-mvp` quand `counts.scraped < target * 0.3` après la première passe.
- 3 stratégies en cascade :
  1. **Variantes de requête** : ajoute synonymes du métier (ex: "rénovation cuisine" → "rénovateur cuisine", "entrepreneur cuisine", "designer cuisine"), `languageCode: fr-CA` puis `en`.
  2. **Élargissement géographique** : ajoute les villes adjacentes via une table `city_adjacency` (ou liste statique QC) pour chaque ville cible.
  3. **Pagination Google Places** : utilise `pageToken` pour aller chercher au-delà des 20 premiers résultats.
- Retourne les nouveaux prospects à `autopilot-mvp` qui les insère dans `outbound_companies` (mêmes règles dedup).

### 3. Blocage explicite si toujours 0 prospect
- Statut `blocked`, `execution_mode = 'blocked'`, `block_reason` détaillé avec : variantes essayées, villes essayées, codes HTTP Google.
- Alerte admin critique avec `suggested_fix` (vérifier quota Google Places, vérifier mapping métier).
- Plus jamais de `dry_run_completed` avec 0 prospect.

### 4. Migration DB
Fichier : nouvelle migration
- `ALTER TABLE autopilot_runs DROP COLUMN simulation_mode, DROP COLUMN simulated_count;`
- `ALTER TYPE` execution_mode : retirer `'simulation'`, garder `real | blocked | pending`.
- `ALTER TABLE outbound_companies DROP COLUMN is_simulated;`
- Purger les lignes simulées existantes : `DELETE FROM outbound_companies WHERE is_simulated = true;` (avant le DROP).
- Recréer `v_autopilot_pipeline` sans les colonnes supprimées.
- Optionnel : créer `city_adjacency(city, neighbor, distance_km)` seed pour QC métropolitain.

### 5. UI Cleanup
Fichier : `src/pages/admin/PageAdminAutopilotMvp.tsx`
- Retirer les badges **SIMULATION** et le compteur **Simulés**.
- Ajouter dans la timeline une étape **Recovery Agent** (avec stratégie utilisée + résultat).
- Quand `status = blocked`, afficher le `block_reason` + bouton "Relancer avec recovery agressif".

### 6. Vérification
- Lancer un run sur "Rénovation cuisine et salle de bain" / Laval + Terrebonne / 30.
- Vérifier dans les logs : `scrape` → si < 30%, `recovery_agent_triggered` → `scraped_count > 0` réel.
- Confirmer en DB : `SELECT scraped_count, execution_mode FROM autopilot_runs ORDER BY started_at DESC LIMIT 1;` → réel ou bloqué, jamais simulé.

## Détails techniques

- L'agent récupération réutilise `searchGooglePlaces` mais avec `nextPageToken` (header `X-Goog-FieldMask` doit inclure `nextPageToken`).
- Liste statique de variantes par métier dans une constante `TRADE_SYNONYMS: Record<string, string[]>` (rénovation, plomberie, toiture, électricité, peinture, etc.).
- Liste statique d'adjacence pour les principales villes QC (Laval ↔ Montréal/Boisbriand/Rosemère ; Terrebonne ↔ Mascouche/Repentigny/Bois-des-Filion).
- Tous les inserts gardent `is_simulated = false` jusqu'à suppression de la colonne.

## Fichiers touchés
- `supabase/functions/autopilot-mvp/index.ts` (refactor)
- `supabase/functions/autopilot-recovery-agent/index.ts` (créer)
- `supabase/migrations/<timestamp>_remove_simulation.sql` (créer)
- `src/pages/admin/PageAdminAutopilotMvp.tsx` (nettoyer UI)
- `src/integrations/supabase/types.ts` (auto-régénéré après migration)
