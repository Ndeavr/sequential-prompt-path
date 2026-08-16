# Garde-fou quotidien invisible (Passeport Maison / espace propriétaire)

## Ce qui existe déjà (vérifié)
- Table `homeowner_usage_monthly` (compteur mensuel par `user_id` + `period_month` + `feature_key`) et `homeowner_usage_events` (registre d'idempotence, contrainte unique `user_id + feature_key + idempotency_key`).
- RPC `homeowner_consume_quota(user, feature, idempotency_key)` : atomique, idempotente, `-1 = illimité`, mois calculé en `America/Toronto`. Exécution réservée au `service_role`.
- RPC `homeowner_usage_snapshot(user)` : plan, propriétés, `quote_analysis_limit/used`, `ai_design_limit/used`.
- Helper serveur `supabase/functions/_shared/homeownerQuota.ts` : `checkHomeownerQuota` (avant travail coûteux), `consumeHomeownerQuota` (après succès réel), `quotaBlockedResponse` (429).
- Appelants : `design-generate` (`ai_design_monthly`) et `analyze-quote-comparative` (`quote_analysis_monthly`), avec clé d'idempotence déjà transmise.
- Côté client : `useHomeownerUsage()` / `useHomeownerPlan()` ; clients `useDesignProject.ts` et `quoteAnalyzer/services/quoteAnalysisClient.ts`.

Conclusion : aucun système de quota parallèle à créer. On étend le système existant d'une seconde dimension « jour ».

## Ce qu'on construit

### 1. Couche données (extension, aucune table dupliquée)
- Ajouter à `homeowner_usage_monthly` un jumeau journalier minimal : nouvelle table `homeowner_usage_daily` (`user_id`, `usage_day date`, `feature_key`, `used_count`, timestamps, unique `(user_id, usage_day, feature_key)`), index `(user_id, usage_day)`. Même modèle, même RLS (lecture propriétaire + admin), GRANT `service_role`.
- Réutiliser **le même** registre `homeowner_usage_events` pour l'idempotence : une clé déjà vue n'incrémente ni le mensuel ni le quotidien.
- Plafonds configurables sans migration : lignes dans `plan_features` avec `feature_key = 'quote_analysis_daily'` et `'ai_design_daily'`, valeur par défaut 3 pour tous les plans propriétaires (`home_decouverte`, `home_plus`, `home_signature`), avec repli codé à 3 si la ligne est absente. Modifier un plafond = un simple `UPDATE` de données.

### 2. Moteur de consommation
- Étendre `homeowner_consume_quota` (même signature) pour appliquer **la règle la plus restrictive** :
  1. résoudre limite mensuelle (peut être `-1`) ET limite quotidienne (défaut 3) ;
  2. idempotence d'abord (rejeu → aucune consommation, réponse `replayed: true`) ;
  3. refus si mensuel plein → `blocked_by: 'monthly'` ;
  4. refus si quotidien plein → `blocked_by: 'daily'` ;
  5. sinon incrémenter mensuel (si limité) **et** quotidien, dans la même transaction.
- Jour calculé en `America/Toronto` : `(now() AT TIME ZONE 'America/Toronto')::date` → reset automatique à minuit local, aucun cron.
- Ajouter une fonction non consommatrice `homeowner_quota_check(user, feature)` retournant `allowed`, `blocked_by`, compteurs mensuel + quotidien, pour le refus rapide avant travail coûteux.
- Étendre `homeowner_usage_snapshot` avec `quote_analysis_today`, `ai_design_today`, `daily_limit`, `daily_blocked` (rétro-compatible : aucun champ existant retiré).

### 3. Fonctions edge
- `_shared/homeownerQuota.ts` : `checkHomeownerQuota` s'appuie sur `homeowner_quota_check` et remonte `blockedBy`. `quotaBlockedResponse` produit deux corps distincts :
  - `blocked_by: 'monthly'` → message actuel (upgrade).
  - `blocked_by: 'daily'` → message premium, **jamais technique** :
    - soumissions : « Vous avez beaucoup avancé aujourd'hui. Vous avez comparé vos soumissions disponibles pour aujourd'hui. Revenez demain pour comparer d'autres soumissions avec UNPRO. » CTA `Revenir à mon Passeport Maison`.
    - designs : « Vos designs d'aujourd'hui sont prêts. Revenez demain pour explorer d'autres possibilités pour votre maison. » CTA `Voir mes designs`.
  - Le corps porte `daily_limit_reached: true`, `resets_at` (minuit Toronto suivant) et le CTA.
- `design-generate` et `analyze-quote-comparative` : aucun changement de flux, seulement le nouveau refus. La consommation reste **après succès réel** (échec/timeout → compteur inchangé) et idempotente.
- Copie centralisée dans `src/lib/copy/usagePolicy.ts` (et miroir Deno partagé) pour éviter la duplication de textes.

### 4. UX client
- Nouveau composant `DailyLimitReachedCard` (glass, tokens sémantiques, dark + light, mobile-first) affiché à la place du bouton de génération quand le serveur répond `daily_limit_reached`.
- Règles strictes : uploads conservés, projet/design existants consultables et téléchargeables, analyses passées accessibles, seule la **nouvelle** génération concernée est désactivée. Aucun mot technique, aucun compteur « 3/3 » affiché.
- `useDesignProject.ts` et `quoteAnalysisClient.ts` : détecter le 429 `daily_limit_reached` et retourner un état dédié plutôt qu'un toast d'erreur.
- Tarification publique inchangée : pas d'astérisque anxiogène. Une ligne « utilisation raisonnable » discrète est ajoutée à la mention légale existante sous les cartes propriétaires.

### 5. Admin
- Dans le cockpit propriétaires existant, une vue `v_homeowner_usage_admin` (SECURITY INVOKER) par utilisateur : analyses aujourd'hui, designs aujourd'hui, quota mensuel utilisé/limite, plafond quotidien, `daily_limit_reached` oui/non, plan.
- Les plafonds étant dans `plan_features`, un admin peut les changer sans migration.

### 6. Tests réels (end-to-end, compte de test)
1. Actions 1-2-3 autorisées ; 2. action 4 bloquée avec l'UX « Revenez demain » ; 3. génération en échec → compteur inchangé ; 4. rejeu de la même clé d'idempotence → compteur inchangé ; 5. appel direct de l'API / autre navigateur → toujours bloqué (le refus est serveur) ; 6. simulation du jour suivant → compteur remis à zéro, mensuel préservé ; 7. plan Gratuit → quota mensuel toujours prioritaire ; 8. scope confirmé = `user_id` (aligné sur l'architecture existante, qui n'est pas par propriété).
- Tests unitaires sur la résolution « limite la plus restrictive » et le calcul du jour Toronto.

## Détails techniques
- Timezone : toujours `America/Toronto` dans le SQL ; aucune date calculée côté client.
- Aucune suppression de données ; toutes les migrations sont additives (`ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS`).
- Audit minimal = `homeowner_usage_events` (déjà présent) + compteurs journaliers horodatés.
- Fail-open conservé uniquement sur panne d'infrastructure de lecture, jamais sur un refus explicite.

## Critères de fin
- Le 4e appel du jour est refusé par le serveur, quel que soit le navigateur ou l'appel direct.
- Les données et résultats antérieurs restent accessibles.
- Aucun texte technique visible par l'utilisateur.
- Les quotas mensuels existants continuent de s'appliquer sans régression.
