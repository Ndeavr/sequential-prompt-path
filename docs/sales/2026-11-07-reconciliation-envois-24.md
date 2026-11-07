# Réconciliation des envois du 6 nov 2026 — lecture seule

Constat vérifié le 7 nov 2026 (02 h 55 UTC, base de production). Aucune mutation, aucun envoi, aucun paiement.

## Ce qui a réellement quitté UNPRO
- 24 demandes d'envoi dans `outreach_email_claims`, toutes avec un identifiant fournisseur.
- 23 `sent`, 1 `failed_final`.
- Deux campagnes : 7 envois + 1 échec (services, 12 h 39 UTC) et 16 envois (chauffage/clim, 14 h 54–15 h 04 UTC).
- Les 24 ont une ligne dans `outreach_email_events`.
- 1 refusal dur enregistré en suppression (`hard_bounce_address_not_found`, source DSN fournisseur, 6 nov 14 h 16 UTC).

## Ce qui manque
- **Preuve CASL révisée par un humain : 0 sur 24.** 16 destinataires ont une preuve machine valide auto-capturée, 7 n'ont aucune ligne de preuve.
- **Preuve de livraison : 0.** `outreach_delivery_events` et `outreach_delivery_logs` vides ; `delivered_verified` absent des métadonnées.
- **Réactions : 0.** 0 ouverture, 0 clic, 0 événement de réponse depuis le 5 nov. La table des réponses SMS reste à 3 lignes, la plus récente au 19 oct.
- **Ventes : 0.** `contractor_recruitment_payments`, `plan_activations`, `unpro_payment_activation_audit` vides ; aucun mouvement dans `contractor_activation_ledger` depuis le 1 nov.
- 0 nouveau prospect créé depuis le 6 nov.

## Garde-fous au moment de la lecture
- `system_flags.OUTREACH_ENABLED = false`.
- `outreach_autopilot_gate` : `gated = true`, score 70, raisons `no_recent_e2e_pass` et `operational_score_below_95`, dernier pass 21 oct.
- Conclusion : les envois du 6 nov n'ont pas transité par le chemin qui consulte ce drapeau et cette porte. La voie exacte n'est pas établie ici et doit être identifiée avant tout lot suivant.

## Preuves CASL en base
- 906 lignes sans `reviewer_id`, 3 avec (base `implicit_public_conspicuous`, source site Web de l'entreprise).
- 0 révision humaine depuis le 5 nov.

## Prochaines actions, dans l'ordre
1. Réconcilier le statut fournisseur des 24 messages (livré, rebond, inconnu) et écrire ce statut dans les journaux de livraison.
2. Décider, destinataire par destinataire, révision humaine de la preuve ou suppression ; aucun destinataire sans preuve ne doit être recontacté avant cette décision.
3. Traiter les réponses réelles des 23 entreprises (aucune enregistrée à ce jour) et les amener à l'activation 350 $ + taxes.
4. Rouvrir la voie d'envoi seulement après : preuve humaine, livraison vérifiée, et passage E2E de QA avec paiement Stripe TEST et webhook signé.
