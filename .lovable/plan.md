## Constat vérifié (lecture seule, maintenant)

- Les objets créés par la migration existent bien : `recruitment_controls`, `recruitment_runs`, `recruitment_run_items`, `recruitment_orchestrator_locks`, `v_recruitment_coverage_gaps`. Le blocage « schema cache » n'est plus visible côté base.
- La ligne unique de `recruitment_controls` est en état sûr : `global_enabled = false`, `autonomous_enqueue_enabled = false`, `sms_enabled = true`, `email_enabled = true`, limites 25 global / 25 par canal / 10 par ville×catégorie, TTL de lease 900s, cooldown prospect 30 jours.

## Objectif

Relancer le dry run de `recruitment-orchestrator` pour Laval × plombier × limit 5, sans aucun envoi et sans toucher au run épinglé Electro Pompe.

## Ce qui sera exécuté

1. **Dry run**
   - Appel `POST /functions/v1/recruitment-orchestrator` avec `{"mode":"dry_run","city":"Laval","category":"plombier","limit":5}`.
   - Vérifier que la réponse contient : opportunité retenue, clé d'idempotence calculée, lease acquis puis relâché, liste des prospects candidats avec raison d'éligibilité/rejet.

2. **Vérification du comportement kill switch**
   - Si le dry run est refusé parce que `global_enabled = false`, confirmer que le refus est bien un blocage *explicite et actionnable* (et non une erreur silencieuse), puis relancer en dry run avec le contournement prévu pour la simulation — le dry run doit pouvoir simuler sans activer l'automatisation live.

3. **Contrôle d'idempotence**
   - Relancer immédiatement le même dry run et confirmer qu'aucun doublon n'est créé dans `recruitment_run_items` (même clé d'idempotence → réutilisation, pas de nouvelle ligne).

4. **Contrôles de non-régression**
   - `first_dollar_active_run` inchangé (Electro Pompe toujours épinglé).
   - Aucun SMS, aucun email, aucune ligne dans les tables d'envoi.
   - Logs de la fonction lus intégralement pour détecter toute erreur masquée.

## Détails techniques

- Aucune migration nouvelle sauf si le dry run révèle un blocage structurel (dans ce cas je m'arrête et je le rapporte avant de modifier la base).
- Aucun passage en live : `dry_run` uniquement. Le test live limit 1 reste une étape séparée à autoriser après un dry run propre.

## Résultat attendu

Un rapport concis : opportunité sélectionnée, N prospects candidats avec raisons, lease OK, idempotence OK, zéro envoi, run épinglé intact.
