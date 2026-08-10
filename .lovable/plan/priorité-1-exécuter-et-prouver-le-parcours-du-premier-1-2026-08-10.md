# Priorité #1 — Exécuter et prouver le parcours du premier 1 $

Objectif : faire tourner le parcours réel en production et produire des preuves d'exécution (pas du code), jusqu'à la seule frontière humaine restante : le paiement de 1 $ par carte réelle.

## Ce que les données de production disent déjà (vérifié)

- `billing_checkout_sessions` contient exactement 1 ligne : session **LIVE** `cs_live_a1s6…TJwg6`, 100 ¢ CAD, plan `activation_7d`, statut `open` / `unpaid`, créée le 2026-08-08 21:08 UTC, jeton d'activation `fd1182781c04486895e5ad`.
- `acq_payment_events` = 0 ligne. Aucun paiement n'a jamais été encaissé.
- `acquisition_events` sur 3 jours : uniquement 2 `clicked` (auto-test du 09-08 06:17). Aucun trafic réel récent.

Conclusion : la chaîne est prouvée jusqu'à « session Stripe LIVE créée ». Rien après n'a jamais été observé en production.

## Déroulé de l'exécution

1. **Cartographier le chemin canonique** (une seule implémentation retenue par étape) : lien d'acquisition → `activation-token-resolve` → page `/unpro/activate/:token` → offre 1 $ / 7 jours → `create-activation-checkout` → `stripe-webhook` → état Supabase → activation entrepreneur → CRM admin. Les doublons historiques (autres fonctions de checkout) sont laissés intacts mais explicitement écartés du chemin officiel.
2. **Choisir un vrai prospect de production** déjà présent dans le pipeline, émettre/réutiliser son jeton d'activation, et faire le parcours réellement : résolution du jeton, chargement de la page, clic sur le CTA.
3. **Créer une nouvelle session Stripe LIVE de 1 $** via le chemin de production, vérifier que l'URL de paiement répond bien (HTTP 200 côté Stripe) et qu'une ligne est écrite dans `billing_checkout_sessions` avec le prospect et le jeton.
4. **Vérifier le webhook avant le paiement** : confirmer que l'endpoint LIVE est bien enregistré côté Stripe, qu'il pointe sur la bonne fonction, et rejouer un événement `checkout.session.completed` de contrôle pour prouver que la synchronisation Supabase (paiement, abonnement, activation, CRM) s'exécute réellement de bout en bout.
5. **Réparer chaque échec rencontré** à chaque étape et relancer l'étape jusqu'au succès. Les corrections restent confinées au chemin de paiement.
6. **STOP à la frontière humaine** : le paiement réel de 1 $ nécessite une carte. Je m'arrête là et je fournis le lien de checkout LIVE exact à utiliser.
7. **Après votre paiement**, vérification de l'aval : événement Stripe reçu, ligne de paiement/abonnement en base, entrepreneur activé, fiche visible et à jour dans le CRM admin.

## Rapport final

Le rapport d'acceptation exact que vous avez demandé (FUNNEL, STRIPE MODE, chaque étape PASS / WAITING / FAIL) avec route, horodatage, ID d'objet Stripe, enregistrement Supabase et résultat de fonction pour chaque PASS. Aucun secret.

## Notes techniques

- Chemin de production visé : `supabase/functions/activation-token-resolve`, `src/pages/activation/PageUnproActivate.tsx`, `supabase/functions/create-activation-checkout`, `supabase/functions/stripe-webhook`, tables `billing_checkout_sessions`, `acq_payment_events`, `acq_subscriptions`, `contractors`, vues CRM `/admin/crm`.
- Aucune nouvelle table, aucune nouvelle page, aucune refonte. Réparation uniquement.
- Hors périmètre : SEO, sitemap, corpus IA, contenu, finding « sales closer », priorité #2.
