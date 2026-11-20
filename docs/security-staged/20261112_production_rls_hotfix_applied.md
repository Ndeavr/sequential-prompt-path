# UNPRO — correctif de sécurité ciblé (2026-11-12)

**État : appliqué directement à la base de production du projet Lovable `ba1eabf3-fd1c-40fe-9856-3812a70f9869`.**
Ce fichier documente le changement ; il ne constitue pas une migration à rejouer automatiquement.
Aucune donnée client supprimée ; aucune modification à Stripe, aux routes ou au déploiement frontend.

## Règles appliquées

- `agent_target_items` : `auth_insert_agent_target_items` et `auth_select_agent_target_items` -> `has_role(auth.uid(),'admin'::app_role)`.
- `agent_target_lists` : `auth_insert_agent_target_lists` et `auth_select_agent_target_lists` -> admin uniquement.
- `outbound_autopilot_runs` : `auth_insert_autopilot_runs` et `auth_select_autopilot_runs` -> admin uniquement.
- `outbound_autopilot_recommendations` : `auth_insert_autopilot_recs` et `auth_select_autopilot_recs` -> admin uniquement.
- `alex_turn_logs` : politique `Anyone can read turn logs` restreinte à `TO authenticated USING (has_role(...,'admin'))`.
- `alex_voice_turns` : politique `Voice turns readable by all` restreinte à admin.
- `alex_runtime_sessions` : politique `alex_runtime_sessions_public_read` restreinte à admin.
- `alex_homeowner_objections` : politique `Read homeowner objections` restreinte à admin.
- `storage.objects`, bucket `painting-photos` : politique `Public can read guest painting photos` restreinte à `anon` et à l'opération `storage.allow_only_operation('object.sign')`; le chemin doit toujours commencer par `guest/`. La règle d'insertion des photos et la lecture propriétaire/admin sont inchangées.

## Vérification effectuée

- Lecture retour des 12 politiques SQL des 8 tables : conditions admin confirmées.
- Lecture retour de la politique Storage : aucune lecture anonyme universelle ; uniquement signature de lien temporaire `object.sign` sur `guest/`.
- Simulation SQL d'un utilisateur authentifié ordinaire : 0 lignes visibles dans `agent_target_items`, `agent_target_lists`, `outbound_autopilot_runs`.
- Simulation SQL du rôle admin depuis un identifiant déjà autorisé (sans divulgation d'identifiant) : `has_role=true` ; 45 éléments de liste et 3 listes visibles.
- Vérification des helpers : `storage.allow_only_operation('object.sign')` retourne true pour `storage.object.sign` et false pour `storage.object.list` ou `storage.object.get_authenticated`.
- Le bucket `painting-photos` était privé et contenait 0 fichier au moment de l'inspection.

## Limites et suite

- La signature anonyme reste possible pour une **clé exacte connue** dans `guest/` ; cela évite de casser la fonction frontend actuelle qui appelle `createSignedUrl`, mais **ne fournit pas une isolation complète entre visiteurs**. Migrer l'upload guest vers une authentification isolée ou un endpoint serveur validant le droit d'accès avant de retirer entièrement cette permission.
- Les inserts publics de télémétrie Clara ont été conservés afin de ne pas briser la qualification en cours. Traiter les autres politiques `WITH CHECK (true)` après audit des callers et des flux.
- Les tests E2E UI + Stripe test mode et le nouveau scan de sécurité Lovable n'ont pas été exécutés. Ne pas annoncer l'alerte complètement résolue tant qu'un rescannage et l'essai du calculateur de peinture ne confirment pas le résultat.
