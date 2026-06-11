## Diagnostic

L'erreur « Failed to send a request to the Edge Function » provient de `/pro/score` en production (`unpro.ca`). Vérifications faites :

- La table `public.founder_score_prospects` existe bien (migration appliquée).
- Aucun log n'existe pour `pro-score-instant` → la fonction n'a jamais été invoquée avec succès en production, ce qui indique qu'elle n'est pas déployée (ou pas encore propagée sur le domaine custom).
- Le code de la fonction est correct (CORS OK, service role OK, schéma DB OK).

## Plan

1. **Déployer** explicitement `pro-score-instant` et `pro-founder-checkout-guest` (les deux fonctions de la Mission 48H) pour garantir leur disponibilité immédiate en production.
2. **Renforcer la fonction** :
   - Logger l'arrivée de la requête et l'erreur DB éventuelle (pour que `edge_function_logs` soit exploitable la prochaine fois).
   - Valider la présence de `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` avant l'insert.
   - Retourner un message d'erreur clair côté client si l'insert échoue.
3. **Tester** la fonction via `curl_edge_functions` avec un payload identique à celui de la page (`Isolation Solution Royal` / `Terrebonne` / `yturcotte@gmail.com`) et vérifier :
   - status 200
   - `prospect_id` retourné
   - ligne créée dans `founder_score_prospects`
4. **Vérifier les logs** post-test pour confirmer l'absence d'erreur DB ou de secret manquant.
5. **Front** : améliorer le message d'erreur sur `PageProScoreInstant.tsx` pour afficher le détail réel (au lieu du message générique « Failed to send a request… »).

## Fichiers touchés

- `supabase/functions/pro-score-instant/index.ts` (logs + validation secrets)
- `src/pages/pro/PageProScoreInstant.tsx` (message d'erreur explicite)
- Déploiement edge functions

## Succès

- `POST /functions/v1/pro-score-instant` → 200 + scores
- Un prospect est créé dans `founder_score_prospects`
- La page `/pro/score` complète le funnel jusqu'à `ScoreRevealCard`
