# Lot 1 RLS — lectures sensibles (préparé 2026-10-30, NON appliqué)

État lu en base (lecture seule) : politiques, `has_table_privilege`, colonnes, nombre de lignes, appels client/edge.

| Table | Lignes | Règles actuelles | Appelants réels | Propriétaire réel | Décision |
|---|---|---|---|---|---|
| owner_match_photos | 0 | SELECT `true` + INSERT `true` (anon, auth) | aucun (types seulement) | aucun (seulement `session_id`) | fermer public; lecture admin |
| homeowner_project_diagnoses | 0 | SELECT `true` + INSERT `true` (public) | edge `alex-homeowner-process-turn` (service role) ; `AdminHomeownerAnalyticsPage` | aucun (`homeowner_session_id`) | fermer public; lecture admin; edge inchangée |
| lead_capture_sessions | 1 | SELECT `true` + INSERT `true` (anon, auth) | `PageAdLandingAipp` insère puis relisait l'id | aucun | insertion anonyme bornée conservée; lecture admin |
| role_permissions | 15 | ALL admin (`has_role`) + SELECT `true` authenticated | `PageBusinessCardScannerHub` (filtre par rôle) | — | **aucun changement** |

## role_permissions — pas d'escalade
Catalogue statique rôle → permission d'interface (ex. `scan_business_cards`). L'écriture est réservée aux admins (politique ALL, WITH CHECK = USING). Lire le catalogue ne donne aucun rôle : les rôles réels restent dans `user_roles`. Le fermer casserait le scanner de cartes. Décision proposée : garder, et documenter le constat comme catalogue public voulu (à ignorer uniquement par vous dans l'onglet Sécurité).

## Impact
- Aucune lecture publique réelle n'existe sur ces 3 tables. La page admin des analyses propriétaires continue de fonctionner pour les admins.
- L'écriture anonyme de la page publicitaire est conservée. Prérequis appliqué ce tour : l'id est généré côté navigateur et l'insertion ne relit plus la ligne. Ce code fonctionne avant ET après la migration ; il doit être publié avant d'appliquer la migration.
- Clara/diagnostics : l'écriture passe par la fonction serveur (service role), non affectée par RLS.
- Retour arrière : recréer les deux politiques `true` d'origine par table (noms dans la migration).

## Ordre
1. Publier le frontend. 2. Appliquer `20261030_rls_batch1_private_reads.sql`. 3. Exécuter `20261030_rls_batch1_tests.sql` (copie isolée ou BEGIN…ROLLBACK). 4. Relancer le scan : 3 constats devraient disparaître ; role_permissions reste signalé.
