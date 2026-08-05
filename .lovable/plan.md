# Relance ciblée — 3 contractants qui ont cliqué

## Situation confirmée

Les 3 prospects ont bien cliqué et ne sont jamais allés au bout :

| Entreprise | Ville | Clic | Étape actuelle | Payé |
|---|---|---|---|---|
| Isolation JTL Inc. | Longueuil | 4 août | checkout ouvert (5 août 10:04 UTC) | non |
| J W Plumbing & Heating | Montréal | 4 août | page d'activation vue | non |
| TOITPRO | Montréal | 4 août | page d'activation vue | non |

Les trois ont un numéro mobile valide et un lien d'activation actif.

## Le blocage à lever

La fonction de relance existante (`second-touch-outreach`) exclut explicitement tout prospect dont le lien a déjà été cliqué. Elle ne peut donc pas servir telle quelle pour ces trois-là : ils seraient filtrés et rien ne partirait.

## Ce qui sera fait

1. **Débloquer la relance sur les prospects qui ont cliqué**
   - Ajouter au moteur de relance un mode "relance ciblée" : quand une liste précise de prospects est fournie, ne plus écarter ceux qui ont déjà cliqué.
   - Marquer ces envois avec un type distinct (`click_recovery`) pour qu'ils ne se mélangent pas aux relances de masse et qu'un seul message par prospect soit possible.
   - Conserver toutes les protections existantes : interrupteur global, liste STOP, plafond d'envoi, journalisation Twilio et suivi de livraison.

2. **Message court, en français, orienté action**
   > UNPRO — {Entreprise} : votre lien d'activation est prêt. 7 jours pour 1,00 $ CA : unpro.ca/unpro/activate/{token}
   > Répondez STOP pour ne plus recevoir de messages.

   Le montant en CAD est mentionné explicitement, puisque c'est précisément ce que le correctif du paiement vient de régler.

3. **Exécution en deux temps**
   - Simulation sur les 3 identifiants exacts : vérifier destinataires, liens et texte.
   - Envoi réel sur les mêmes 3 identifiants, puis relevé des SID Twilio et des statuts de livraison.

4. **Suivi**
   - Réconciliation après envoi : livré → clic → checkout → payé, visible dans le tableau de bord de lancement.
   - Aucun autre prospect n'est touché : rien d'automatique, rien de massif.

## Détails techniques

- `supabase/functions/second-touch-outreach/index.ts` : accepter `relance_kind` et un mode ciblé qui n'applique pas le filtre `clicked_at` lorsque `prospect_ids` est fourni ; texte du message dépendant du type de relance.
- Redéploiement de la fonction, puis deux appels : `{"dry_run":true,"prospect_ids":[...]}` puis `{"dry_run":false,"prospect_ids":[...]}`.
- Aucune migration de base de données, aucune modification du checkout, du CRM ou de l'orchestrateur.

## Terminé quand

Les 3 SMS sont acceptés par Twilio avec un SID, journalisés en `click_recovery`, et le statut de livraison de chacun est reporté.
