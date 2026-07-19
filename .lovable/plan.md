
# Plan — Gestion complète des affiliés UNPRO

Objectif : réparer Lorraine, brancher toutes les routes/tables/permissions manquantes, puis livrer les modules Import & Impersonation.

## Phase 1 — Réparation immédiate de Lorraine (P0)

1. **Migration `affiliates`** : ajouter `affiliate_type` (default `affiliate`), `status` enum étendue (`draft|invited|active|suspended|disabled|archived`), `short_login_token`, `invited_at`, `activated_at`, `last_login_at`, `permissions jsonb`.
2. **Diagnostic route `/a/:slug`** : au lieu de "Affilié introuvable", résoudre par slug et afficher :
   - Publique → "Ce lien n'est pas actif" si statut ≠ active/invited
   - Admin connecté → panneau diagnostic (profil trouvé, compte auth manquant, statut, user lié)
3. **Edge function `affiliate-repair`** : trouve/crée profil `slug=lorraine`, relie user par email/phone, ajoute `user_roles.role='affiliate'`, passe `status=active`, génère `short_login_token`, retourne rapport.
4. **Route de redirection `/:slug`** : middleware qui, si `/lorraine`, `/marc`, etc. matche un affiliate slug → redirige 301 vers `/a/:slug`. Cohabite avec les routes existantes via une whitelist inverse (ne pas casser `/admin`, `/pro`, etc.).

## Phase 2 — Création admin & invitations

5. **Route `/admin/affiliates/new`** : formulaire complet (identité, type, slug, territoires, permissions, taux commission). 3 boutons : *Créer et inviter*, *Créer sans envoyer*, *Créer et ouvrir comme affilié*.
6. **Edge function `affiliate-create`** : transactionnelle — crée profil, réserve slug (unique), crée/relie auth user (invite par email si nouveau), assigne role, génère short_login_url, envoie SMS+email si demandé, journalise.
7. **Templates invitation** : SMS + email (fr-CA) avec `{{short_login_url}}` traçable + expirable.
8. **Route `/admin/affiliates/:id`** : fiche complète avec sections Identité, Accès, Territoires, Permissions, Prospects, Commissions, Historique. Boutons : Réparer, Relier user, Renvoyer OTP, Copier lien, Ouvrir comme affilié, Suspendre, Archiver.
9. **Liste `/admin/affiliates`** : colonnes complètes + filtres (type, statut, ville, invité, jamais connecté) + actions par ligne.

## Phase 3 — Connexion OTP affilié & changement de rôle

10. **Route `/affiliate/login`** : tabs Téléphone (OTP SMS via Supabase auth) / Courriel (magic link). Résout profil affilié après auth, redirige vers `/affiliate/war-room`.
11. **Route `/go/:slug`** : lien court personnel — pré-remplit login form avec le téléphone/email de l'affilié cible. Si déjà connecté = même compte → war-room ; autre compte → propose "Changer".
12. **Menu utilisateur — Changer d'espace** : composant global lisant `user_roles` actifs, affiche uniquement les rôles réels. Sélection met à jour `active_role` (context + localStorage), redirige vers dashboard par défaut.
13. **Déconnexion propre** : bouton dans tous les espaces, clear session Supabase + active_role + impersonation, redirige `/login`. Bouton "Changer de compte" → logout puis `/affiliate/login` vide.

## Phase 4 — Impersonation admin

14. **Table `admin_impersonations`** : `admin_user_id, affiliate_id, started_at, ended_at, ip, actions jsonb`.
15. **Edge function `admin-impersonate-start` / `-end`** : génère token JWT signé stocké dans un cookie `impersonation_ctx` séparé, ne remplace pas la session admin. Toutes les requêtes RLS utilisent ce contexte via header.
16. **Bannière persistante** : composant global "Vous consultez UNPRO comme {name} — [Retour admin]". Bloque actions financières sensibles (checkout, payouts).

## Phase 5 — Permissions & partenaires multi-membres

17. **Migration permissions** : colonne `permissions jsonb` avec 11 clés (`can_add_leads`, `can_send_personal_sms`, etc.). Defaults par type.
18. **RLS réel** : policies sur `contractor_leads`, `commissions`, `affiliate_activities` utilisant `has_affiliate_permission(auth.uid(), 'can_view_commissions')` en SECURITY DEFINER.
19. **Table `partner_members`** (`affiliate_id, user_id, role owner|manager|agent|viewer, status`) + route `/partner/team` (invite, modifier rôle, suspendre).

## Phase 6 — War Room états vides & données réelles

20. **Vérifier `/affiliate/war-room`** : KPIs branchés sur `contractor_leads` filtrés `assigned_affiliate_id=me`. Cas vides remplacés par les 3 empty states (profil prêt / profil incomplet / invitation à finaliser) avec CTAs.

## Phase 7 — Import rapide de prospects

21. **Migrations** : `affiliate_import_batches` (file_name, source_type, counts, status) + `affiliate_import_rows` (raw_data, normalized_data, validation_status, duplicate_prospect_id, error_messages, imported_prospect_id).
22. **Route `/affiliate/prospects/import`** + bouton "+ Importer une liste" dans war-room, 5 sources : copier-coller texte, CSV, XLSX, Google Sheets (lien public), texte libre.
23. **Edge function `affiliate-import-analyze`** : parse (papaparse / SheetJS côté client pour XLSX), détection en-têtes, mapping auto → écran mapping (source → champ UNPRO), normalisation téléphones (`normalizePhone`), dédup contre `contractor_leads` (phone_e164, email, domain, name+city), retourne apperçu + statut par ligne.
24. **Edge function `affiliate-import-commit`** : insère lignes valides dans `contractor_leads` avec `created_by_affiliate_id`, `assigned_affiliate_id`, `source_type='affiliate_import'`, `import_batch_id`. Traite en arrière-plan pour >200 lignes.
25. **Limites par type** : ambassador 100 / affiliate 1000 / partner 10000 / admin illimité — enforced côté edge.
26. **Post-import** : écran résultat (X ajoutés, doublons, erreurs), CTAs *Voir prospects*, *Préparer 25 SMS perso*, *Télécharger rapport erreurs* (CSV).
27. **Enrichissement optionnel** : bouton "Enrichir les données" déclenche `enrich-lead-from-web` en batch sans écraser les valeurs saisies (`data_origin='imported'`, `enriched_fields`).

## Critères de succès

Livré uniquement quand : Lorraine créable par admin, visible dans assignation, `/a/lorraine` fonctionne, `/lorraine` redirige, OTP reçu, War Room atteinte, déconnexion + change de rôle OK, impersonation traçable, RLS bloque cross-affilié, import 50 lignes Excel → prospects assignés en <60s, aucun écran "introuvable" pour un profil valide.

## Détails techniques

- Aucune duplication de tables — extend `affiliates`, `user_roles`, `contractor_leads` existants.
- Chaque nouvelle table : GRANT + RLS + policies dans la même migration.
- Edge functions : Deno + `esm.sh/@supabase/supabase-js@2.49.1`, CORS, validation Zod, error surfacing.
- Fr-CA partout, timezone `America/Toronto` via helpers existants.
- Reliability : `reportOutcome()` sur create/invite/impersonate/import.
- Ne pas retoucher aux modules Alex, Stripe checkout, ou email infrastructure (déjà stables).
