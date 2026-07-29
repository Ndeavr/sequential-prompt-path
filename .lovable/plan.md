## Constat vérifié (lecture seule, aujourd'hui)

- `v_first_dollar_tracker` choisit encore le « lancement actif » par **date seule** : `ORDER BY outreach_sent_at DESC LIMIT 1` sur `verified_contractor_prospects`.
- Conséquence vérifiée : le prospect actif n'est **plus** Electro Pompe mais **E.B. Plomberie inc.** (`816ccccf…`, SID `SM91c8d480…`, envoyé 2026-07-29 15:56 UTC), car un batch de 25 SMS a été envoyé aujourd'hui.
- Pour ces prospects récents : `outreach_delivered_at` et `outreach_clicked_at` sont `NULL` (aucun clic, aucune livraison confirmée).

Donc le défaut réel restant n'est pas un `MIN()` historique, c'est **la sélection du run actif par date**. C'est exactement ce que la demande vise à supprimer.

## Objectif

Supprimer toute sélection par date et ancrer le tracker sur un prospect actif **explicite**, avec toutes les étapes aval liées par identité (prospect_id / lead_id / token / SID / téléphone) et jamais par simple horodatage.

## Ce qui sera construit

1. **Ancrage explicite du run**
   - Ajouter une table de configuration mono-ligne `first_dollar_active_run` (prospect_id, lead_id, phone_e164, twilio_sid, label, is_active, timestamps + RLS admin/service_role + GRANTs).
   - Seed avec Electro Pompe : `aa4ebd75…`, `dd9f83bb…`, `+14503285551`, `SM7770bec70bfd1ea15d88ef8b13a3888b`.
   - Redéfinir `v_first_dollar_tracker` pour lire ce pin. **Aucun `ORDER BY … DESC LIMIT 1`, aucun `MIN()` global, aucune fenêtre par date.**

2. **Attribution stricte des jalons**
   - FIRST SMS → `success` (SID épinglé présent).
   - DELIVERY → `pending` tant que `outreach_delivered_at` du prospect épinglé est NULL.
   - CLICK → `pending` sauf événement de clic joint explicitement au prospect_id, au lead_id, au tracking token du run, ou au SID.
   - Registration / OTP / Stripe checkout / Payment / Activation → `pending` sauf lien explicite au même prospect ou lead. Aucun `EXISTS` global, aucun `created_at > date`.

3. **Textes d'action**
   - `conversion_next_action` = « Clic sur le lien d'activation »
   - `technical_next_action` = « Réparer StatusCallback Twilio »
   - Alignement identique dans `supabase/functions/contractor-revenue-timeline/index.ts`.

4. **Affichage admin**
   - `src/hooks/useAcquisitionFunnel.ts` et `src/pages/admin/PageAdminAcquisitionPipeline.tsx` : afficher le nom + identifiants masqués du prospect épinglé, les deux prochaines actions séparées, et un badge « Run épinglé » pour qu'aucun opérateur ne confonde avec l'historique.

5. **Vérification avant publication**
   - Requête de contrôle : le tracker doit retourner Electro Pompe, SMS = success, tous les jalons aval = pending, et zéro clic/activation hérité.
   - Si un clic ou une activation historique apparaît encore, **pas de publication** ; correction de la jointure d'abord.

## Détails techniques

- Migration : création `public.first_dollar_active_run` (+ GRANT authenticated/service_role, RLS admin), seed Electro Pompe, `CREATE OR REPLACE VIEW public.v_first_dollar_tracker` en `SECURITY INVOKER`.
- Edge function `contractor-revenue-timeline` : lire le pin au lieu du dernier envoi.
- Aucun autre système touché (pas d'outreach, pas de SEO, pas de Stripe, aucun envoi).

## Point à confirmer

Aujourd'hui 25 SMS réels ont été envoyés (dont E.B. Plomberie). Épingler Electro Pompe rendra le tracker volontairement aveugle à ce batch. La table de pin permet de basculer en une ligne. Je procède avec Electro Pompe comme demandé sauf indication contraire.
