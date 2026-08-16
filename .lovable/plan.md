# Lancer la vague d'acquisition entrepreneurs (état réel vérifié)

## Ce que les données de production montrent aujourd'hui

- 266 prospects entrepreneurs au total, dont **230 jamais contactés** (`outreach_status = not_started`), 220 numéros distincts.
- Répartition des 230 : toiture 51, isolation 50, plomberie 41, drain français 35, asphalte 14, plombier 12, paysagement 7, autres 15.
- **Blocage n°1 (mesuré)** : sur ces 230, `outreach_eligible = true` pour **0**, `phone_sms_capable` est **null pour 230**, `phone_type` null pour 230. 190 ont un `phone_e164`. Les envoyeurs filtrent sur ces champs : la vague ne peut pas partir tant que la validation de ligne n'a pas tourné.
- **Blocage n°2 (mesuré)** : incohérence d'offre. Les gabarits SMS/email (`send-verified-batch`, `second-touch-outreach`) annoncent encore « activation 1 $ » / « 7 jours pour 1 $ », alors que l'offre d'entrée validée est le **pack 350 $ – jusqu'à 5 rendez-vous garantis**. Le message et la page d'atterrissage ne racontent pas la même chose.
- Historique : 431 SMS envoyés (37 sur 7 jours), 28 clics sur lien d'activation, 3 entrepreneurs créés en 30 jours.
- Garde-fous en place : `recruitment_controls` armé (global/SMS/email actifs, 150/jour global, 25/canal, cooldown 30 j), 0 suppression, 0 désabonnement, 2 `do_not_contact`.

## Objectif de cette étape

Faire partir une vague réelle et propre sur les 230 prospects non contactés, avec un message cohérent avec l'offre 350 $, et mesurer chaque transition.

## Étapes

### 1. Débloquer l'éligibilité téléphonique
- Faire tourner `validate-lead-phones` sur les 230 prospects `not_started` (par lots de 50, cap quotidien respecté).
- Remplir `phone_e164`, `phone_type`, `phone_sms_capable`, puis `outreach_eligible`.
- Les lignes fixes ne sont pas rejetées : elles basculent sur le canal email quand un email existe (41 en ont), sinon elles restent en file affiliée.

### 2. Aligner le message sur l'offre 350 $
- Centraliser le texte via `src/lib/copy/offer350.ts` (miroir serveur partagé) et retirer les mentions « 1 $ » des gabarits SMS et email de `send-verified-batch` et `second-touch-outreach`.
- Message SMS : profil d'entreprise déjà préparé + jusqu'à 5 rendez-vous garantis pour 350 $, paiement unique, lien `/unpro/activate/:token`.
- Vérifier que la page d'activation affiche la même promesse et le même prix que le SMS.

### 3. Vague contrôlée par paliers
- Palier 1 : 25 envois (catégorie toiture, meilleurs scores). Attendre 24 h.
- Critère de passage : ≥ 90 % de livraison Twilio, 0 plainte, ≥ 1 clic.
- Palier 2 : 50 envois. Palier 3 : le reste, 50/jour maximum.
- Relance seconde touche seulement pour les livrés non cliqués, une seule fois.

### 4. Instrumentation de la vague
- Chaque transition écrite dans `acquisition_events` : `sms_sent`, `delivered`, `landing_viewed`, `cta_clicked`, `checkout_started`, `paid`.
- Vue de suivi par palier et par catégorie exposée dans le cockpit admin d'acquisition.

### 5. Cockpit
- Ajouter à `/admin/official-acquisition` un bloc « Vague en cours » : éligibles, envoyés, livrés, cliqués, payés, palier actif, prochain déblocage.

## Détails techniques

- Fonctions touchées : `validate-lead-phones`, `send-verified-batch`, `second-touch-outreach`, `acquisition-autopilot`.
- Nouveau partagé : `supabase/functions/_shared/offerCopy.ts` (miroir de `src/lib/copy/offer350.ts`).
- Aucune migration destructrice : uniquement remplissage de colonnes existantes et une vue de suivi.
- Google Places reste désactivé ; aucune dépense d'enrichissement payante dans cette étape.
- Les caps de `recruitment_controls` ne sont pas augmentés.

## Fini quand

- Les 230 prospects ont un statut d'éligibilité déterminé (SMS, email ou file affiliée).
- Aucun message sortant ne mentionne 1 $.
- Palier 1 envoyé, livraison mesurée, décision de palier 2 basée sur des chiffres réels.
- Le cockpit montre la vague en direct, du premier envoi au premier paiement.
