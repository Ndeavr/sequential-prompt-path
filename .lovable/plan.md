## Constat vérifié

- `recruitment-orchestrator` supporte bien `mode: "execute_controlled_test"` (seul mode où `provider_calls_made = true` et où l'envoi réel est délégué avec `dry_run: false`).
- Le mode live est bloqué tant que `recruitment_controls.global_enabled = false` (état actuel constaté au dry run) — le refus est explicite, pas silencieux.
- Le lease d'orchestration et la clé d'idempotence stable (sans suffixe `run_id`) ne s'appliquent qu'hors dry run : c'est ce qui garantit l'absence de doublons.

## Objectif

Envoyer exactement 1 sollicitation réelle à un plombier de Laval, sans doublon, sans toucher au run épinglé Electro Pompe.

## Exécution

1. **Pré-vol (lecture seule)**
   - Relire `recruitment_controls` (kill switch, canaux, limites).
   - Confirmer `system_environment_state.kill_switch_active = false`.
   - Re-jouer le dry run limit 1 pour figer le prospect candidat exact (nom, ville, téléphone, preuve CASL) et l'afficher avant tout envoi.

2. **Activation minimale et réversible**
   - Passer `global_enabled = true` uniquement (l'`autonomous_enqueue_enabled` reste `false` : pas d'automatisation continue).
   - Limites resserrées pour ce run : 1 global / 1 par canal / 1 par ville×catégorie.

3. **Run live**
   - `POST /functions/v1/recruitment-orchestrator` avec `{"mode":"execute_controlled_test","city":"Laval","category":"plombier","limit":1}`.
   - Vérifier : lease acquis puis relâché, 1 seule ligne dans `recruitment_run_items`, statut de délégation, SID Twilio réel (ou fallback email si SMS rejeté).

4. **Contrôle anti-doublon**
   - Relancer immédiatement le même appel : la clé d'idempotence doit réutiliser le run existant, aucun second envoi, aucune nouvelle ligne.
   - Vérifier côté envoi qu'aucun second SMS/email n'existe pour le même destinataire normalisé.

5. **Retour à l'état sûr**
   - Remettre `global_enabled = false` et restaurer les limites d'origine (25/25/10) après le test.

6. **Non-régression**
   - `first_dollar_active_run` inchangé (Electro Pompe épinglé).
   - Lecture intégrale des logs de la fonction pour détecter toute erreur masquée.

## Détails techniques

- Aucune modification de code n'est prévue. Les seuls écrits sont sur `recruitment_controls` (activation puis désactivation) et les tables de run/envoi produites par le run lui-même.
- Si le run échoue au stade envoi (Twilio/Resend), je m'arrête, je remets le kill switch, et je rapporte le code d'échec canonique exact sans réessayer en boucle.

## Résultat attendu

Rapport court : prospect ciblé, canal utilisé, SID/ID d'envoi réel, idempotence confirmée (2e appel = 0 envoi), contrôles remis en position sûre, run épinglé intact.
