
# Audit réel du tunnel SMS → 1 $ + relances automatiques

Objectif : passer du « tunnel câblé » au « tunnel qui vend ». Deux livrables :

1. Un cockpit qui affiche **les chiffres réels** de chaque étape et identifie le blocage #1.
2. Un moteur de relances J+1 / J+3 / J+7 branché sur Twilio.

Pas de nouveau design. Pas de nouvelle page pour l'utilisateur. Tout est admin + backend.

---

## 1. Cockpit `/admin/tunnel-reality`

Une seule page, une seule question : *où s'arrête l'argent ?*

Tableau vertical à 14 lignes, chiffres agrégés sur 24 h / 7 j / 30 j (toggle) :

```text
Étape                          Total  Conv%  Dernière   Statut
1. SMS envoyés (Twilio)        ...    —      ...        🟢/🟡/🔴
2. SMS livrés                  ...    %/sent ...
3. SMS échoués + raison top    ...    %      ...
4. Clics short link            ...    %/deliv ...
5. Landing ouverte             ...    %/click ...
6. Compte créé                 ...    %      ...
7. Checkout Stripe ouvert      ...    %      ...
8. Paiement 1$ réussi          ...    %      ...
9. Paiement 1$ échoué          ...    —      ...
10. Profil complété            ...    %      ...
11. Entrepreneur activé        ...    %      ...
12. Recommandable par Alex     ...    %      ...
```

Chaque cellule est **une requête réelle** (pas un mock) :
- SMS envoyés/livrés/échoués → `acq_sms_logs` + `outreach_sms_events` (source : Twilio webhooks déjà en place).
- Clics → `click_events` + `outreach_clicks` filtrés `source=sms_outreach`.
- Landing ouverte → `contractor_funnel_events` type `landing_view`.
- Compte / paiement / activation → `checkout_sessions` + `billing_events_log` + `prospects.funnel_status`.
- Recommandable → `prospects.recommendable = true`.

Règles de couleur (par étape, sur 7 j) :
- 🔴 = 0 ou conversion sous seuil critique (livraison <70 %, clic <5 %, paiement <0.5 %).
- 🟡 = sous seuil cible (livraison <90 %, clic <10 %, paiement <1 %).
- 🟢 = au-dessus des seuils cibles listés dans le brief.

En haut de la page :
- **Bandeau blocage #1** : première étape 🔴 dans l'ordre du funnel + raison top (`error_code` le plus fréquent sur 7 j).
- Chip « Dernière vente réelle : il y a X h » basé sur `paid_1_dollar` transitions.

Refresh 30 s. Bouton « Copier le rapport » (markdown des 14 lignes).

## 2. Vue Postgres `v_tunnel_reality`

Une seule vue matérialisée-friendly qui expose les 14 métriques × 3 fenêtres (24h/7j/30j) + `last_event_at` + `top_error`. Le front lit cette vue uniquement — pas de dizaines de requêtes en parallèle.

`GRANT SELECT` à `authenticated` (page réservée aux admins via `RoleGuard`).

## 3. Relances automatiques J+1 / J+3 / J+7

Edge function `outreach-relance-cron` déclenchée chaque heure via `pg_cron` :

Cibles :
- **J+1** : prospects `sms_sent` sans clic depuis 24 h.
- **J+3** : prospects `clicked` sans paiement depuis 72 h.
- **J+7** : prospects `checkout_started` sans paiement depuis 7 j **ou** J+3 sans conversion.

Règles :
- Cap 3 relances max par prospect (colonne `relance_count` déjà utilisable via `prospects` ou nouvelle si absente).
- Respect suppression list + fenêtre d'envoi (`outreach_send_windows`).
- Chaque relance = un short link **régénéré** (nouveau token → tracking distinct par relance).
- Log dans `acq_sms_logs` + transition dans `prospect_status_transitions` (`relance_j1`, `relance_j3`, `relance_j7`).

Copie exacte (fr-CA, du brief utilisateur) :

- J+1 : *« Toujours intéressé à être recommandé par l'IA d'UNPRO ? Activation 7 jours : 1 $. {link} »*
- J+3 : *« Nous recherchons actuellement des entrepreneurs dans votre secteur. Activation : 1 $. {link} »*
- J+7 : *« Dernier rappel. Votre profil peut être activé aujourd'hui pour 1 $. {link} »*

## 4. Toggle sécurité

Dans `/admin/tunnel-reality` :
- Switch `dry_run` (par défaut ON) : la cron simule et écrit dans `acq_sms_logs` avec `status='simulated'` sans appeler Twilio.
- Bouton « Envoyer les relances en attente maintenant » (dry ou live selon le switch).

## Détails techniques

- Migration : vue `v_tunnel_reality`, colonne `relance_count int default 0` sur `prospects` si absente, valeurs enum ajoutées à `prospect_status_transitions.event`.
- Edge functions : `tunnel-reality-report` (calcul + top error) et `outreach-relance-cron` (envoi J+1/J+3/J+7).
- Cron : `select cron.schedule('outreach-relance-hourly', '0 * * * *', $$ ... net.http_post ... $$)` inséré via `supabase--insert` (contient l'anon key), pas via migration.
- Front : nouvelle page `src/pages/admin/PageTunnelReality.tsx` + route `/admin/tunnel-reality` + entrée sidebar admin.
- Aucune modification aux pages `/invitation/*`, au webhook Stripe, ni au checkout.

## Critères de succès

- `/admin/tunnel-reality` affiche 14 valeurs numériques réelles issues de la DB (jamais de mock).
- Le bandeau nomme la 1re étape 🔴 et la raison top.
- La cron J+1/J+3/J+7 tourne, respecte le cap de 3, et est visible dans `acq_sms_logs`.
- Toggle dry-run empêche tout envoi Twilio quand actif.
