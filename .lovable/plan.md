
## Audit — existant à réutiliser

Tables déjà en place : `affiliates`, `affiliate_profiles`, `affiliate_applications`, `affiliate_assignments`, `affiliate_links`, `affiliate_clicks`, `affiliate_sessions`, `affiliate_attributions`, `affiliate_conversions`, `affiliate_commissions`, `affiliate_activities`, `affiliate_lead_events`, `affiliate_message_templates`, `affiliate_proposals`, `commissions`, `contractor_leads` (avec attribution affilié), `referral_events`, `profiles.referral_code`, `profiles.affiliate_code`, `user_roles`.

Pages / composants déjà en place :
- Public : `/partners`, `/partenaires/:slug` (PageSignaturePartner), `ReferralLandingPage`, `/ambassadeurs`.
- Affilié connecté : `/affiliate` (War Room), `/affiliate/company/:id`.
- Admin : `/admin/affiliates` (Hub 10 onglets), `/admin/affiliates/dashboard`, `/admin/affiliates/assign`.
- Modules : `AddLeadSheet` (4 modes), `PersonalSmsSheet`, `LeadActionBar`, `AssignedLeadsList`, `AffiliateRevenueIntelligencePanel`, `PotentialCommissionPipeline`, `useAffiliateTracking`, `useReferralAttribution`, `useReferralProfile`, `BecomeRoleCTA`, edge functions `extract-business-card`, `enrich-lead-from-web`, `lead-dedupe-check`.

Ce qui manque : page publique `/affilies` de conversion, flow d'auto-activation (utilisateur connecté ou nouveau), page perso dynamique par slug, onglet propriétaire dans l'ajout de recommandation, mini dashboard affilié pour non-admin (utilise composants existants), config admin des taux de commission.

## Livrables (ce qu'on ajoute vs réutilise)

### 1. Page publique `/affilies` (nouvelle)
`src/pages/affiliate/PageAffiliesPublic.tsx` + route publique.
- Hero + parcours 4 étapes.
- 3 cartes (Entrepreneur / Propriétaire / Partenaire) avec CTAs.
- FAQ (8 questions).
- Bloc "Déjà affilié ? Voir mon tableau de bord" → `/affiliate`.
- Design premium UNPRO, mobile-first, glass léger, contraste AA, tokens sémantiques (respect `mem://standards/ui-readability-rule`).
- SEO : titre, meta, canonical.

### 2. Activation affilié multirôle (nouveau, sans nouveau compte)
`src/pages/affiliate/PageAffilieActivation.tsx` (route `/affilies/activer`).
- Si `useAuth().user` existe : formulaire court (type d'affilié, méthode préférée, ville, langue, consentement) préremplit depuis `profiles`. À la soumission :
  1. `user_roles` : upsert rôle `affiliate`.
  2. `affiliates` : upsert (user_id, type, territoire, slug généré depuis full_name / entreprise, referral_code depuis `profiles.referral_code` ou généré).
  3. Bienvenue toast, redirection `/affiliate`.
- Si non connecté : formulaire complet (prénom/nom/email/tel/ville/langue/type/entreprise?/site?/consentement) → auth OTP existante → même flux d'activation.
- Utilise `BecomeRoleCTA` pattern déjà en place (upsert user_roles).

Boutons "Activer" ajoutés aussi dans :
- `PageProProfile` (entrepreneur connecté) — encart "Programme affilié".
- `PageAccount` propriétaire — même encart.

### 3. Page perso dynamique `/a/:slug` (nouveau)
`src/pages/affiliate/PageAffiliePublicProfile.tsx` (route publique).
- Résout `slug` via table `affiliates` (colonne `slug` ou `public_slug` — vérifier, sinon ajouter migration).
- Affiche : nom public (respect préférence d'affichage), pitch UNPRO, deux formulaires courts (Entrepreneur recommandé / Propriétaire recommandé — onglets), bouton "Partager cette page", code promo si présent.
- La soumission crée un `contractor_leads` (côté entrepreneur) ou un enregistrement `referral_events` + lead propriétaire (côté homeowner) avec `assigned_affiliate_id = affiliate.id`, attribution UTM.
- La route `/lorraine` existante continue de fonctionner via redirection `/lorraine` → `/a/lorraine` (ou route legacy conservée pointant vers la même page).

### 4. Formulaire recommandation unifié (améliore l'existant)
`src/features/affiliate/addLead/AddLeadSheet.tsx` : ajouter onglet "Propriétaire recommandé" à côté d'"Entrepreneur". Champs minimaux propriétaire (prénom, tel/email, ville, besoin, moment, consentement). Utilise même dédupe (`lead-dedupe-check` étendue si besoin).

### 5. Dashboard affilié `/affiliate` (améliore l'existant)
Réutilise `PageAffiliateWarRoom`. Ajouts :
- KPIs top : recommandations aujourd'hui/semaine, inscriptions démarrées, activations, commissions pending/approved/paid, revenu potentiel/total (`AffiliateRevenueIntelligencePanel` + `PotentialCommissionPipeline` déjà présents).
- Pipeline standardisé (tous les statuts listés dans la demande) via `contractor_leads.lead_status` + `affiliate_conversions`.
- Actions rapides : `LeadActionBar` (déjà là) + note, relance, générer lien de paiement (via `create-founder-activation-checkout` existante), copier lien perso.

### 6. Admin `/admin/affiliates` (améliore l'existant)
Onglets déjà présents (10). Compléter uniquement :
- Onglet "Taux & règles" : CRUD sur `commission_rules` (nouvelle table minimale si absente) — taux par plan, fixe/pourcentage, unique/récurrent, bonus, durée d'attribution, période de validation.
- Onglet "Commissions" : approuver/refuser/marquer payé (utilise `affiliate_commissions` existante).
- Statuts affilié standardisés (`application_started` → `inactive`).

### 7. Attribution & commissions (câblage)
- `useAffiliateTracking` déjà installé au niveau app : conserver.
- À la conversion (activation Stripe validée) : edge function existante de webhook Stripe → créer `affiliate_commissions` en `pending` en fonction des règles `commission_rules` et de l'`affiliate_attributions` liée. Si aucune règle configurée, aucune commission n'est créée (aucun taux inventé).
- Empêcher auto-référencement (`referrer_user_id != referred_user_id`), doublon, commission sur remboursement (webhook `charge.refunded` → passer commission à `voided`).

### 8. Migration SQL (minimale)
Ajoute uniquement ce qui manque :
- `affiliates.slug` (unique, nullable) si absent + backfill depuis referral_code ou full_name.
- `affiliates.display_preference` (`full_name` | `first_name` | `business` | `neutral`).
- `affiliates.affiliate_type` enum (`contractor` | `homeowner` | `partner` | `rep` | `creator` | `other`) si absent.
- Table `commission_rules` (plan_slug, rate_type, rate_value, recurring, bonus_cents, attribution_days, validation_days, active). Grants + RLS admin-only écriture, lecture authenticated.
- Table `affiliate_settings` (singleton) pour durée d'attribution et fenêtre de validation par défaut.
- RLS sur toutes les vues affilié : l'affilié ne voit que ses lignes (`assigned_affiliate_id = affiliate_of(auth.uid())`), l'admin voit tout via `has_role`.

### 9. Sécurité / permissions
- Vérifier RLS de : `contractor_leads`, `affiliate_commissions`, `affiliate_conversions`, `affiliate_attributions`, `referral_events`, `commission_rules`.
- Journal d'audit : `affiliate_lead_events` déjà présent — étendre pour commission approve/reject/pay.

## Détails techniques (résumé)

```text
/affilies              → PageAffiliesPublic (nouveau, public)
/affilies/activer      → PageAffilieActivation (nouveau, auth aware)
/a/:slug               → PageAffiliePublicProfile (nouveau, public)
/lorraine              → redirect 301 vers /a/lorraine (legacy safe)
/affiliate             → PageAffiliateWarRoom (amélioré: KPIs + pipeline)
/admin/affiliates      → PageAffiliatesHub (onglet Règles/Taux + Commissions)
```

Hooks nouveaux : `useAffiliateActivation`, `useAffiliateBySlug`, `useAffiliateCommissionRules`.
Aucun autre composant/table dupliqué. Aucun compte séparé. Aucun texte fictif ni taux inventé.

## Critères de succès
Ceux listés dans la demande (§17) — un propriétaire ou entrepreneur connecté peut activer son statut d'affilié sans recréer de compte, `/lorraine` reste fonctionnel, pipeline et commissions branchés sur les vraies tables, admin peut configurer les taux, RLS scopée par affilié.

## Hors scope (à confirmer avant build)
- Paiements de commissions (versement) — on marque `paid` manuellement ; l'intégration Stripe Connect payouts n'est pas incluse.
- Refonte du module Partenaires (`/partners`, `/partenaires/:slug`) : conservé tel quel, il coexiste avec Affiliés.
