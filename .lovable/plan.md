## Objectif

Livrer un vrai CRM affiliés (admin + affilié) capable de recruter des entrepreneurs UNPRO, envoyer SMS perso, suivre le pipeline et payer les commissions. Livraison en 4 sprints. Ce plan commence par le **Sprint A** qui débloque le bug bloquant `/admin/affiliates/assign` ("Aucun affilié actif") et pose les fondations pour tout le reste.

## Bug immédiat à corriger (Sprint A, jour 1)

`PageAffiliateAssignment.tsx` interroge `affiliate_profiles` (table quasi vide, ancien schéma) au lieu de `affiliates` (table canonique). C'est pour ça que la liste est vide. On bascule sur `affiliates` filtrée par `status='active'` et on utilise `affiliates.id` comme cible d'assignation. On aligne aussi `contractors_prospects.assigned_affiliate_id` pour référencer `affiliates.id`.

## Sprint A — Fondations + Assignation qui marche

1. **Migration DB** (ajouts idempotents, aucune donnée détruite) :
   - `affiliates` : ajouter `last_name`, `province`, `territories text[]`, `total_assigned/contacted/trials/converted int`, `total_commissions_cents int`. Élargir `status` (`pending|active|suspended|training|admin`).
   - Nouvelle table `affiliate_applications` (candidatures) + RLS (insert public via edge, select admin).
   - Nouvelle table `commissions` (id, affiliate_id, contractor_id, plan, sale_cents, commission_cents, status `pending|approved|paid`, dates).
   - Étendre `contractor_leads` : `created_by_affiliate_id`, `assigned_affiliate_id` déjà présents → s'assurer que **tout lead créé par un affilié dans AddLeadSheet** met les deux (déjà fait dans `useAddLead.insertLead`, vérifier).
   - View `v_affiliate_kpis` (par affilié : total_assigned, contacted, trials, conversions, revenue, commissions).
   - GRANT + RLS strict (affilié voit ses données, admin voit tout via `has_role('admin')`).

2. **Fix `/admin/affiliates/assign`** :
   - Requête vers `affiliates` (`id, first_name, last_name, name, primary_city, status, commission_pct`) filtrée `status IN ('active','training','admin')`.
   - Affichage nom + ville + %.
   - Assignation écrit dans `contractors_prospects.assigned_affiliate_id` **et** dans `contractor_leads.assigned_affiliate_id` si le prospect existe déjà comme lead (upsert par téléphone/email).
   - Historisation dans `affiliate_lead_events` (`event_type='assigned'`).

3. **Nouveau `/admin/affiliates`** avec onglets (shell + 2 onglets fonctionnels d'abord) :
   - Dashboard : cartes KPI globales (affiliés actifs, prospects assignés, essais 1$, abonnements, revenus, commissions dues), graphique 30j.
   - Affiliés : table (nom, ville, tél, email, prospects, essais, conversions, revenus, commissions, statut) + bouton **+ Ajouter affilié**.
   - Onglets Prospects / Assignations / Applications / Commissions / Paiements / Leaderboard / Documents / Paramètres présents en shell (skeleton "à venir") pour éviter les liens morts.

4. **Créer un affilié** (`+ Ajouter affilié`) :
   - Form : prénom, nom, tél, email, ville, territoires (multi), catégories (multi), commission %, quota, statut.
   - Edge function `admin-create-affiliate` : crée `auth.users` (invite email), insère `affiliates` avec `user_id` et `referral_code` auto-généré, envoie SMS/email d'invitation avec lien magic.

## Sprint B — War Room affilié complète

Route `/affiliate/war-room` (existe partiellement) enrichie :

- Top bar : *Aujourd'hui — 25 prospects · 8 contactés · 2 essais · 120 $ commissions potentielles* (données réelles via `v_affiliate_kpis`).
- Liste prospects triée priorité (score × recency × statut).
- Bouton flottant **📷 Scanner carte** ouvre `BusinessCardCapture` déjà présent.
- Bouton **+ Ajouter prospect** ouvre `AddLeadSheet` (déjà fait). Vérifier `created_by_affiliate_id + assigned_affiliate_id` remplis.
- Sur chaque carte : SMS perso (déjà), Appeler, SMS UNPRO (Twilio), Email, WhatsApp, Notes, Statut.
- Statuts étendus : `new|contacted|sms_sent|called|callback|interested|trial_1dollar|premium|elite|refused|lost`.
- Fiche prospect `/affiliate/leads/:id` : Entreprise, Acquisition, Onboarding, Notes, Historique (events chronologiques), Plan suggéré, Commission potentielle.

## Sprint C — Commissions & paiements

- Cron `compute-commissions` : sur `checkout_sessions.status='paid'`, si `contractor` a `assigned_affiliate_id`, créer ligne `commissions` (montant selon plan × `commission_pct`).
- `/affiliate/commissions` : mois/trim./année, par plan, statut.
- `/admin/affiliates/commissions` : approbation en masse, export CSV/Stripe/QuickBooks.
- `/admin/affiliates/payouts` : lots de paiement, statut, exports.

## Sprint D — Leaderboard, applications, documents, settings

- `/affiliate/leaderboard` + `/admin/affiliates/leaderboard` (par conversions / revenus / commissions).
- Page publique `/affiliate/apply` → `affiliate_applications`. Admin approuve → crée affilié (réutilise edge du Sprint A).
- `/admin/affiliates/documents` : bibliothèque PDF (scripts, présentation, FAQ) via storage bucket privé.
- `/admin/affiliates/settings` : règles d'assignation (ville → catégorie → affilié), quotas globaux, seuils de charge.

## Détails techniques

- **RLS** : `affiliate_owner(affiliate_id)` sur toutes les tables affilié ; admin via `has_role`.
- **Reliability** : chaque action passe par `reportOutcome()` avec `FailureCode` (déjà en place pour SMS perso).
- **Attribution** : tout lead ajouté par affilié écrit obligatoirement `created_by_affiliate_id=assigned_affiliate_id=<self.id>`. Un job nightly reprocess les leads orphelins créés par un user affilié.
- **Aucune perte de données** : migrations additives, `affiliate_profiles` conservée en lecture seule (deprecated) le temps de migrer les 0 lignes existantes.
- **Mobile-first** : boutons ≥ 48px, deep links `sms:` / `tel:` / `whatsapp://`, bouton caméra flottant persistant sur War Room.

## Livraison

Sprint A d'abord (bugfix + fondations + `/admin/affiliates` shell + création d'affilié) — ~1 gros commit. Puis on enchaîne B → C → D à ta demande.
