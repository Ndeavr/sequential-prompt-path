# Programme affilié UNPRO — landing publique, onboarding et entrée en prospection

Objectif : une page qu'on envoie telle quelle à une future affiliée. Elle comprend en moins de 30 secondes, clique « JE COMMENCE! », s'active en 4 étapes courtes et arrive directement sur le Mode Action (Trouver → Contacter → Envoyer → Suivre → Gagner), sans jamais voir le CRM complet.

## Ce qui existe déjà (vérifié) et sera réutilisé, pas reconstruit

- Route publique `/affilies` (`PageAffiliesPublic`) et activation `/affilies/activer` (`PageAffilieActivation`) — déjà branchées dans le routeur.
- Activation réelle : `useAffiliateActivation` (crée le rôle `affiliate` dans `user_roles`, la ligne `affiliates`, le `slug` et le `referral_code`, rattache le parrain sous-affilié).
- Attribution : `useReferralAttribution` (capture `?ref`, `intent`, `utm_source` en localStorage) + `useAffiliateTracking` (clics, sessions).
- Connexion sans mot de passe déjà en place : OTP SMS ou lien courriel (`/affiliate/login`).
- Mode Action affilié livré au tour précédent : `/affiliate` (5 cartes + CTA fixe), CRM déplacé sur `/affiliate/crm`.
- Évaluation IA : `ai-recommendation-audit`, `affiliate-send-audit`, `affiliate-audit-track`, `ai_recommendation_audits` (avec `affiliate_id`, `lead_id`, `invite_token`, `sent_at/opened_at/started_at/completed_at`).
- Prospects et dédoublonnage : `contractor_leads`, `lead-dedupe-check`, `insertLead`.
- Conditions : table `partner_terms_acceptance` (`user_id`, `role`, `terms_version`, `accepted_at`, `ip_address`, `user_agent`) + textes réels dans `src/lib/partnerTerms.ts`.
- Paramètres du programme : `affiliate_settings` (fenêtre d'attribution 30 j, validation 14 j, override sous-affilié 5 %), lisible par tout compte connecté.

Constat important sur la rémunération : il n'existe **aucun taux public par défaut**. Le taux est par affiliée (`affiliates.commission_pct`). La landing publique n'affichera donc **aucun pourcentage** — seulement les mécanismes réels (attribution à l'affiliée, fenêtre d'attribution 30 jours, validation 14 jours, suivi dans l'espace UNPRO). Le taux réel de la personne s'affichera dans son espace une fois activée.

## Ce qui sera construit

### 1. Landing publique — réécriture de `/affilies`

Même route (aucune duplication), contenu entièrement refait, mobile-first, français, identité UNPRO existante, grandes cartes, aucun jargon, aucun faux chiffre ni faux témoignage. `/affilie` (singulier) redirigera vers `/affilies`.

Contenu : hero (eyebrow, titre, sous-titre, gros CTA « JE COMMENCE! »), parcours vertical ① Trouvez ② Contactez (avec la carte-script et « votre objectif n'est pas de vendre ») ③ Envoyez l'évaluation IA (les 5 découvertes) ④ Suivez (Envoyée → Ouverte → Commencée → Terminée) ⑤ UNPRO prend la relève (Évaluation → Profil → Objectifs → Solution → Inscription) puis « Vous ouvrez la porte. UNPRO fait le reste. », section rémunération (mécanismes réels + liste des compteurs suivis), CTA intermédiaire, FAQ courte reprise de l'existant.

Tous les CTA pointent vers le même onboarding en conservant `ref`, `intent`, `utm_*` et la campagne.

### 2. Onboarding 4 étapes — `/affilies/onboarding`

Une étape par écran, barre « 1 sur 4 », reprise possible après interruption (brouillon local + reprise du compte existant).

1. **Vous** — prénom, nom, téléphone, courriel, ville. Si non connectée : vérification OTP SMS (repli lien courriel) réutilisant le flux passwordless existant. Si un compte/affiliée existe déjà : on complète, on ne duplique jamais.
2. **Comment travailler** — 4 choix multiples.
3. **Canaux** — téléphone / texto / courriel / en personne + rassurance.
4. **Activation** — récapitulatif graphique du parcours, case des conditions réelles (lien vers les conditions), CTA « 🚀 VOIR MON PREMIER PROSPECT ».

`/affilies/activer` restera fonctionnelle mais redirigera vers ce nouvel onboarding.

### 3. Activation backend

Un seul appel serveur `affiliate-onboarding-activate` (edge function) qui, de façon idempotente : complète le profil, ajoute le rôle `affiliate` (jamais admin), crée/complète la ligne `affiliates`, garantit `referral_code` + `slug`, enregistre les préférences de travail et de canaux, écrit l'acceptation des conditions dans `partner_terms_acceptance` (version + horodatage + IP + user-agent), conserve la source d'acquisition (`ref`, `utm`, campagne) et rattache le parrain via la logique sous-affilié existante. Puis redirection vers `/affiliate` avec la carte ① TROUVER active — sauf si un prospect en cours exige déjà un suivi, auquel cas la carte correspondante s'ouvre.

### 4. Analytics

Une table d'événements dédiée `affiliate_funnel_events` (affiliate_id nullable, session_id, event_type, ref/utm, metadata) alimentée depuis la landing, l'onboarding et le Mode Action : `affiliate_landing_view`, `affiliate_start_clicked`, `onboarding_started`, `onboarding_step_completed`, `affiliate_activated`, `first_prospect_viewed`, `call_started`, `audit_sent`, `audit_opened`, `audit_started`, `audit_completed`, `profile_claimed`, `checkout_started`, `paid_conversion`, `commission_created`. Les événements d'audit et de conversion sont écrits côté serveur à partir des états réels — aucune étape simulée. Aucune donnée sensible côté client.

### 5. Admin

Une vue `/admin/affiliates/attribution` : Affiliée → prospects → audits → conversions → commissions, avec la source clairement marquée « Fourni par UNPRO » ou « Trouvé par l'affiliée » (déduite de `source_type` / `created_by_affiliate_id`) et l'historique d'attribution auditable. Rien de tout cela n'apparaît dans l'interface affiliée.

### 6. Erreurs et mobile

Chaque cas a un message simple et une action suivante : compte déjà existant, téléphone/courriel déjà utilisé, prospect en doublon, prospect déjà attribué à une autre affiliée, aucun prospect disponible, évaluation déjà envoyée, échec SMS/courriel, lien d'audit impossible, utilisateur non autorisé, session expirée. Boutons pleine largeur ≥ 56 px, CTA principal collant sans masquer le contenu, protection double clic, retour navigateur et reprise d'onboarding testés.

### 7. Test golden path réel

Parcours complet exécuté en production sur un vrai prospect éligible : landing → JE COMMENCE! → 4 étapes → conditions → activation → premier prospect → appel → envoi de l'évaluation → tracking d'ouverture/complétion → transfert UNPRO → profil/checkout Stripe (350 $) → attribution → commission. Aucune donnée fictive. La seule étape qui peut rester non prouvée est le paiement réel par un tiers ; elle sera vérifiée jusqu'à la création de la session Stripe attribuée, et l'écart restant sera nommé explicitement.

## Détails techniques

- Migrations : `affiliate_funnel_events` (RLS : insertion publique restreinte au propre session_id, lecture affiliée limitée à ses propres lignes, lecture admin complète, GRANT explicites) et colonnes de préférences sur `affiliates` (`work_preferences text[]`, `preferred_channels text[]`, `acquisition_source jsonb`).
- Edge functions : `affiliate-onboarding-activate` (verify_jwt = true, service role, idempotente), extension légère de `affiliate-audit-track` pour émettre aussi les événements de funnel.
- Pages : réécriture de `PageAffiliesPublic.tsx`, nouvelle `PageAffiliateOnboarding.tsx` (+ composants d'étapes), nouvelle page admin d'attribution.
- Aucune nouvelle table de prospects, d'audits, de commissions ou de rôles : tout passe par les structures existantes.
