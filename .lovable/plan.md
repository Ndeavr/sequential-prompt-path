## Problème

Le Command Center affiche "Snapshot failed: Failed to send a request to the Edge Function".

Diagnostic :
- Les logs de `founder-health-snapshot` montrent uniquement `booted` — aucune invocation HTTP n'arrive.
- Les 4 fonctions créées dans la dernière itération (`founder-health-snapshot`, `founder-run-live-test`, `founder-stripe-test-flow`, `founder-execute-fix`) n'ont jamais été déployées sur le runtime.
- Le code et la page sont corrects.

## Correctifs

1. **Déployer les 4 edge functions** via `supabase--deploy_edge_functions` :
   - `founder-health-snapshot`
   - `founder-run-live-test`
   - `founder-stripe-test-flow`
   - `founder-execute-fix`

2. **Durcir le CORS** (préventif, 1 ligne par fichier) en ajoutant `Access-Control-Allow-Methods: POST, OPTIONS` aux `corsHeaders` des 4 fonctions, pour éviter tout futur échec de preflight sur certains navigateurs mobiles.

3. **Vérification** :
   - Re-test "Refresh" sur `/admin/founder-verification`
   - Lire `supabase--edge_function_logs founder-health-snapshot` pour confirmer une invocation 200 avec persist OK.
   - Confirmer que les KPI (Modules / Healthy / Degraded / Failing) s'affichent avec les valeurs réelles.

## Hors scope

- Aucune nouvelle logique métier, aucune nouvelle table, aucun nouveau composant UI.
- Pas de modification de la page `PageFounderVerification.tsx`.
