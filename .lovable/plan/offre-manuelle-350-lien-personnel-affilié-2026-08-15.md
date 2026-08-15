# Offre manuelle 350 $ — lien personnel affilié

Objectif : un télévendeur/affilié envoie son lien personnel pendant un appel, l'entrepreneur voit une page d'offre UNPRO claire et paie 350 $ CAD. Le paiement est attribué à l'affilié et au prospect. Le tunnel automatisé 1 $ n'est pas touché.

## 1. Existant réutilisé (audité)

| Besoin | Existant |
| --- | --- |
| Identités affiliés | `affiliates` (`referral_code`, `slug`, `status`, `commission_pct`, `commission_flat_cents`, `commission_rate`) |
| Liens / clics | `affiliate_links`, `affiliate_clicks`, `affiliate_sessions`, hook `useAffiliateTracking` (capture `?ref=`) |
| Attribution / commissions | `affiliate_attributions`, `affiliate_conversions`, `affiliate_commissions`, `affiliate_settings` |
| Liens prospect-liés | `affiliate_activation_links` (affiliate_id + prospect_id + token_hash + expires_at) |
| Checkout Stripe LIVE | `create-activation-checkout` (patron : Stripe 18.5.0, `adaptive_pricing:false`, `locale: fr-CA`, metadata canonique) |
| Webhook | `stripe-unpro-webhook` (idempotent via `unpro_stripe_webhook_events`, garde `checkUnproMetadata` exigeant `platform=unpro` + `brand=unpro`, audit dans `unpro_payment_activation_audit`) |
| Prospects CRM | `contractor_prospects` (business_name, phone_e164, city, contractor_id, public_slug…) |
| CRM affilié | `/affiliate` War Room, `LeadActionBar`, `PersonalSmsSheet`, `messageBuilder.buildActivationLink`, `logLeadEvent` → `affiliate_lead_events` |
| Dashboards | `/affiliate`, `/admin/affiliates`, `/admin/affiliates/dashboard` (`PageAffiliateDashboard`) |
| Succès / onboarding | `/activation-success`, puis flux objectifs Alex (`activation-goals`) |

Aucun système parallèle : on ajoute une route, une edge function de checkout, un branchement d'attribution dans le webhook.

## 2. Route et UX

- `GET /offre/350/:code` — `code` = `affiliates.referral_code` (ou `slug`), lien personnel copiable.
- Variante liée au prospect : `/offre/350/:code?p=<token>` où `<token>` est un `affiliate_activation_links` existant (affiliate_id + prospect_id) → préremplit nom d'entreprise, ville, téléphone, courriel.
- Résolution serveur : nouvelle edge function publique `offer-350-resolve` (service role) qui valide l'affilié (`status` actif) et renvoie `{ affiliate: {id, first_name, display}, prospect: {business_name, city, email, phone} | null, offer: {code:'manual_350', amount_cents:35000, currency:'cad'} }`. Aucune lecture directe de `affiliates` côté client (RLS ne l'autorise pas).
- Code inconnu/inactif → page rendue en mode neutre UNPRO sans attribution (CTA reste actif, `affiliate_id` nul) ; jamais d'attribution à un affilié invalide.
- Contenu mobile-first : logo UNPRO, nom d'entreprise si connu, titre sur le positionnement pour la recommandation IA sans refonte de site, liste « ce qui est inclus », **un** CTA dominant « Activer maintenant — 350 $ », rassurance « ce qui se passe ensuite », FAQ courte (4 questions). Aucune valeur barrée / « valeur régulière » (aucun prix de référence approuvé n'existe en code) ; aucune promesse de résultat.
- Sans prospect : champs minimaux avant checkout — nom d'entreprise, courriel, téléphone (courriel repris par Stripe).
- Après paiement : `/activation-success?session_id=…&offer=manual_350` → parcours objectifs Alex existant.

## 3. Schéma (minimal)

1. `offer_manual_350_events` : `id, affiliate_id, prospect_id, code, event_type ('view'|'form_started'|'checkout_started'|'paid'), session_token, stripe_session_id, amount_cents, metadata, created_at`. RLS : insert via edge function (service role) uniquement ; select = admin ou affilié propriétaire.
   - Alternative si l'on veut zéro table : réutiliser `affiliate_clicks` + `affiliate_conversions`. On garde une table dédiée car il faut le suivi vue→checkout→payé par offre, non couvert aujourd'hui.
2. Aucune modification de `affiliates`, `affiliate_conversions`, `affiliate_commissions` (colonnes suffisantes ; `metadata.offer_code` porte `manual_350`).
3. Grants explicites `authenticated` / `service_role` sur la nouvelle table.

## 4. Stripe / webhook

- Nouvelle edge function `create-manual-350-checkout` (calquée sur `create-activation-checkout`) :
  - montant **serveur uniquement** : price Stripe LIVE dédié 350 $ CAD à créer (produit « UNPRO — Activation Pro (offre 350 $) »), `mode: 'payment'`, `locale: 'fr-CA'`, `adaptive_pricing:{enabled:false}` ;
  - rejette tout montant/price envoyé par le client ;
  - revalide l'affilié côté serveur à partir du code (statut actif) avant d'écrire l'attribution ;
  - metadata : `platform:'unpro'`, `brand:'unpro'` (obligatoire pour ne pas être mis en quarantaine), `offer_code:'manual_350'`, `affiliate_id`, `affiliate_code`, `prospect_id`, `contractor_id`, `activation_type:'manual_offer_350'`, `source:'affiliate_manual'`.
- `stripe-unpro-webhook` → `handleCheckoutCompleted` : ajouter une branche `offer_code === 'manual_350'` qui, en plus de l'audit existant :
  - insère `affiliate_conversions` (conversion_type `manual_350`, `value_cents = session.amount_total`, `commission_amount_cents` calculé **seulement** si `affiliates.commission_pct`/`commission_flat_cents` est configuré, sinon `status='pending_unconfigured'` sans montant inventé) ;
  - met à jour `contractor_prospects.payment_status`/`activation_status` si `prospect_id` présent ;
  - insère l'événement `paid` dans `offer_manual_350_events`.
  - Idempotence : inchangée (dédup par `stripe_event_id`) + upsert par `stripe_session_id` sur la conversion.

## 5. Attribution

Clic lien perso → `offer-350-resolve` (valide l'affilié, journalise `view` + `affiliate_clicks`) → `affiliate_id` conservé côté serveur via un `session_token` signé/UUID renvoyé au client → passé au checkout → revalidé serveur → metadata Stripe → webhook → `affiliate_conversions` (+ `affiliate_commissions` si règle configurée). Le client ne peut donc pas forcer un `affiliate_id`, seulement un code public qui est revalidé.

## 6. CRM

- War Room affilié (`LeadActionBar`) : nouveau bouton « Envoyer offre 350 $ » ouvrant la feuille existante style `PersonalSmsSheet`, message pré-rédigé contenant `/offre/350/:code?p=<token>`.
  - Copier le lien → journalise `offer_350_link_copied` uniquement (aucun faux événement d'envoi).
  - Envoi SMS/courriel par UNPRO → passe par le routeur de communication existant avec gates CASL / opt-out / garde 24 h ; journalise `offer_350_sent` + canal dans `affiliate_lead_events`.
- Bloc « Mon lien 350 $ » dans `/affiliate` : lien + copie + compteurs vues / checkouts / payés / revenu (depuis `offer_manual_350_events`).
- Admin : colonne « Vendu par » dans `/admin/affiliates/dashboard` et liste des paiements 350 $ (affilié, entreprise, montant, date, session Stripe).

## 7. Sécurité / RLS

- Page publique en lecture seule via edge function ; aucun accès anon à `affiliates`.
- Montant et price ID exclusivement serveur.
- Affilié inactif/inexistant → aucune attribution.
- Nouvelle table : RLS activée, policies admin + affilié propriétaire, écriture service_role.
- Aucun secret côté client ; Stripe LIVE inchangé pour les autres tunnels.

## 8. Tests

1. Résolveur : code valide / inactif / inexistant / avec token prospect.
2. Checkout : session `cs_live_` en `mode: payment`, 35000 CAD, metadata complète (vérification via l'API Stripe, sans paiement fictif).
3. Webhook : rejeu du même `stripe_event_id` → une seule conversion (idempotence prouvée).
4. Commission : affilié avec règle configurée → montant calculé ; sans règle → `pending_unconfigured`.
5. Anti-spoof : `affiliate_id` injecté dans le body ignoré.
6. Rendu mobile/desktop avec prospect riche et sans prospect (aucune section vide).
7. Vérification CASL : envoi bloqué si opt-out, copie manuelle toujours possible.

## 9. Critères de complétion

- `/offre/350/:code` en production, mobile-first, personnalisée quand le prospect est connu.
- Une session Stripe LIVE 350 $ CAD réelle créée avec metadata `offer_code=manual_350` + `affiliate_id`.
- Webhook idempotent écrivant paiement + attribution affilié.
- Affilié voit son lien et ses métriques ; admin voit qui a vendu chaque 350 $.
- Action CRM « Envoyer offre 350 $ » disponible, journalisée, conforme CASL.
- Tunnel 1 $ automatisé inchangé (aucune régression sur `create-activation-checkout`).

## Question ouverte

Le prix Stripe LIVE 350 $ n'existe pas encore en code. Je le crée via l'outil Stripe (produit + prix ponctuel 35000 CAD) au moment de l'implémentation, sauf si un produit existant doit être réutilisé.
