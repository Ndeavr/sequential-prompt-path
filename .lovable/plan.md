# Sous-affiliés — override 5 % (V1, un seul niveau)

Extension du système d'affiliation existant. Aucun nouveau système, aucune route dupliquée, aucun second moteur de commissions.

## État actuel vérifié

- Table `affiliates` (referral_code, commission_rate, commission_pct, commission_flat_cents, status, totaux) — **aucune colonne parent** aujourd'hui.
- Commissions : deux tables coexistent — `affiliate_conversions` (par transaction : value_cents, commission_rate, commission_amount_cents, status) et `affiliate_commissions` (récurrent par contrat/plan). La création par transaction passe par la fonction SQL `track_affiliate_conversion` et par le trigger `crm_apply_contact_outcome` (activation 1 $ → insert dans `affiliate_conversions`).
- Attribution : `affiliate_attributions` + `affiliate_clicks` + `affiliate_sessions`, RPC `detect_referral_source` / `confirm_referral_attribution`, hooks `useReferralAttribution.ts` et `useAffiliateTracking.ts` (localStorage `ref`).
- Pages : `/affilies` (public), `/affilies/activer`, `/affiliate` (tableau de bord affilié), `/admin/affiliates` (+ dashboard, assign, new).
- Les webhooks Stripe (`stripe-unpro-webhook`, `stripe-webhook`, `launch-stripe-webhook`) **ne créent aucune commission affiliée** actuellement ; la commission provient du chemin CRM/activation. Le branchement de l'override se fera donc au même point d'entrée que la commission directe, pas dans le webhook.

## Ce qui est construit

### 1. Relation parent (base de données)

Migration idempotente :
- `affiliates.parent_affiliate_id uuid null references affiliates(id)`, `parent_assigned_at`, `parent_attribution_id` (référence vers l'évidence d'attribution).
- Contraintes : auto-parrainage interdit (`id <> parent_affiliate_id`), trigger empêchant les cycles (A→B→A) et empêchant la modification du parent une fois assigné (seul un admin via fonction dédiée peut réassigner, avec log).
- Index sur `parent_affiliate_id`.
- Aucun calcul récursif : un seul niveau, jamais de remontée en cascade.

### 2. Enregistrement de l'override

- `affiliate_conversions` reçoit : `commission_kind text not null default 'direct'` (`direct` | `subaffiliate_override`), `parent_of_affiliate_id uuid` (l'affilié vendeur, quand la ligne est un override), `source_conversion_id uuid` (lien vers la commission directe source), `source_event_key text`.
- Index unique partiel sur `(source_conversion_id) where commission_kind = 'subaffiliate_override'` → **impossible de créer deux overrides pour la même vente**, y compris si un webhook Stripe est rejoué.
- Index unique sur `source_event_key` là où il est fourni, pour l'idempotence côté événement de paiement.

### 3. Moteur de commissions (serveur uniquement)

- Extension de `track_affiliate_conversion` (et du trigger CRM d'activation) : après création de la commission directe inchangée, si le vendeur a un `parent_affiliate_id` valide et actif → insertion d'une seconde ligne `subaffiliate_override` = **5 % du revenu admissible** (`value_cents`), statut aligné sur la commission directe.
- Taux 5 % stocké en paramètre serveur (`affiliate_settings.subaffiliate_override_pct`, défaut 5), jamais envoyé par le client.
- L'override est payé par UNPRO : la commission du vendeur n'est jamais réduite.
- Revenus admissibles : on réutilise strictement la définition existante (activation 1 $, offre 350 $, plans entrepreneurs déjà commissionnables). Aucune transaction Stripe supplémentaire n'est rendue commissionnable.
- Remboursement / annulation / rétrofacturation : la logique de renversement existante propage l'état à la ligne override liée par `source_conversion_id`.
- Totaux affiliés : les compteurs directs restent inchangés ; l'override est agrégé séparément (jamais mélangé aux ventes directes).

### 4. Lien de recrutement + attribution

- Réutilisation du `referral_code` existant : destination canonique `/affilies?ref=CODE&intent=join`.
- La capture d'attribution existante (`useReferralAttribution` + `affiliate_clicks` + `affiliate_attributions`) est étendue avec `intent=join` afin de distinguer un recrutement d'affilié d'un renvoi client.
- Persistance : localStorage + enregistrement serveur immédiat dans `affiliate_attributions` (code, affilié référent, horodatage d'arrivée, source). L'attribution financière ne dépend jamais uniquement du client.
- À la création du compte affilié (candidature/activation), une fonction serveur résout le code et fixe `parent_affiliate_id` + `parent_attribution_id` + `parent_assigned_at`.
- Règles : parent déjà valide → clics ultérieurs ignorés (loggés comme `attribution_rejected`) ; code invalide, affilié suspendu/archivé, ou auto-parrainage → refusé, aucun parent.

### 5. Page publique `/affilies`

Nouvelle section premium « Bâtissez votre équipe » (identité visuelle existante, mobile-first, français) :
- Texte demandé, exemple chiffré 350 $ → 17,50 $.
- Mentions claires : un seul niveau direct, 5 % sur revenu admissible, l'affilié recruté conserve sa commission normale, soumis aux règles de paiement et de remboursement existantes.
- CTA : « Devenir affilié UNPRO » ; pour un affilié connecté : « Partager mon lien de recrutement ».
- Aucun vocabulaire de revenu passif illimité ni de plan à paliers multiples.

### 6. Tableau de bord affilié `/affiliate`

Section **Équipe** ajoutée au tableau de bord existant :
- Bloc « Recrutez des affiliés » avec le texte fourni, bouton « Copier mon lien de recrutement », partage SMS / courriel / Facebook / Messenger, Web Share API sur mobile.
- Indicateurs : Sous-affiliés, Actifs, Ventes de l'équipe, Commission équipe.
- Répartition des gains : **Mes commissions** / **Commission équipe — 5 %** / **Total**, jamais fusionnés.
- Liste d'équipe (cartes sur mobile, table sur bureau) : nom, date d'adhésion, statut, revenu admissible, commission 5 % générée, dernière activité admissible. Aucune donnée client ni détail de transaction exposé.
- États chargement / vide (texte « Votre équipe commence ici » + CTA) / erreur. Aucune donnée factice.

### 7. Admin

Extension de `/admin/affiliates` (aucun second système) :
- Colonne/fiche parent, liste des recrues directes, chaîne d'attribution (code, horodatages, source, IDs).
- Vue commissions avec filtres : Direct, Sous-affilié 5 %, Pending, Approved, Paid, Reversed ; lien vers la transaction source et le statut de versement.
- Action admin explicite (loggée) pour corriger un parent mal attribué.

### 8. Sécurité / RLS

- Un affilié lit son compte, ses commissions (directes et override) et un sous-ensemble limité d'infos sur ses recrues directes (nom, statut, date, revenu admissible agrégé).
- Écriture de `parent_affiliate_id`, des taux et des commissions : interdite aux affiliés (policies + trigger de protection colonne). Création/validation/paiement uniquement via fonctions `security definer` et service role.
- Admin via `has_role(auth.uid(),'admin')` existant. GRANT ajustés pour toute nouvelle vue.

### 9. Journal d'audit

Événements loggés dans le système d'audit existant, avec IDs permettant de reconstituer la chaîne financière : lien de recrutement généré, référence captée, affilié recruté, parent assigné, vente admissible détectée, commission 5 % créée, commission renversée, versement traité, attribution rejetée, doublon empêché.

### 10. Tests

Tests automatisés + parcours réel de bout en bout :
- Chaîne A recrute B, B vend 350 $ : B garde sa commission, A reçoit exactement 17,50 $.
- Un seul niveau : la vente de Julie ne rémunère pas Sophie.
- Sans parent, code invalide, auto-parrainage, clics répétés, parent déjà existant + nouveau clic.
- Paiement échoué, remboursement (les deux commissions s'ajustent), rejeu de webhook (aucun doublon).
- Tentatives d'API non autorisées (modification de parent/commission par un affilié).
- Vérification mobile du tableau de bord.

## Critères d'achèvement

Livré uniquement quand : lien de recrutement fonctionnel, attribution persistée côté serveur, parent stocké correctement, commission directe inchangée, override 5 % exact, zéro doublon, remboursements propagés, données réelles au tableau de bord, chaîne auditable en admin, RLS vérifiée, mobile validé, test réel de bout en bout réussi.
