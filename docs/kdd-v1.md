# KDD v1 — conversion revenus vérifiée et demande non servie

Panneau admin : `/admin/kdd` (menu Revenus → « KDD v1 »). Lecture seule, FR-Québec, aucune action automatique.

## Fichiers
- `src/lib/kdd/kddV1.ts` — calcul pur (dédoublonnage, exclusions, rythme America/Toronto, cohortes, demande, constats).
- `src/services/kddV1Service.ts` — lecture : `has_role(auth.uid(),'admin')` confirmé avant toute lecture, puis SELECT paginés (1 000/page, 20 pages max → « Partiel » si atteint).
- `src/pages/admin/PageAdminKddV1.tsx` — états chargement / accès refusé / erreur + réessai (aucun faux zéro) / vide / données; tableaux défilables sur mobile.
- Tests : `src/lib/kdd/__tests__/kddV1.test.ts`, `src/pages/admin/__tests__/PageAdminKddV1.test.tsx`.

Aucune table, migration, cron, fonction serveur ou service payant ajouté.

## Autorisation
- Route sous `AdminProtectedRoute` (rôle admin) + vérification serveur `has_role` (échec ou erreur → refus, aucune lecture).
- Toutes les sources sont déjà admin-only par RLS existante. Lecture anonyme vérifiée : 200 `[]` sur les six tables.
- Colonnes minimales : aucun nom, courriel, téléphone ni payload Stripe brut n'est chargé (chemins JSON ciblés). Les courriels de `activation_flow_events` servent uniquement de clé de dédoublonnage normalisée, jamais affichée.

## Sources et règles
| Bloc | Sources | Règle |
|---|---|---|
| 1. Objectif 3 000 × 350 $ | `contractor_activation_ledger` + `stripe_webhook_events` | Miroir de `contractor_plan_code()` : ligne `entry_activation_350_paid`/`stripe_webhook`, `metadata.livemode='true'`, jointe par `stripe_event_id` **et** session à un événement `checkout.session.completed`/`async_payment_succeeded` `livemode=true`, `payment_status=paid`, `amount_subtotal=35000`, CAD, offre `entry_activation_350`/`entry_pack_350`. Exclus : TEST/`test_mode`/`e2e_test`, remboursement/contestation (`charge.refunded`, `charge.dispute.*`, échec async) par payment intent, `deactivated` du grand livre, non payé, livemode inconnu, droit sans preuve, sans identité. Unique par entreprise (1re session); 2e session même entreprise signalée, jamais comptée. Montant = sous-total avant taxes. |
| Rythme | idem | Jour civil America/Toronto; jours restants inclusifs jusqu'au 31 déc. 2026; observé = activations vérifiées des 30 derniers jours / 30. |
| Autres offres | `stripe_webhook_events` | Sessions LIVE payées non-350 groupées par offre; 1 $/gratuit étiquetés à part, jamais additionnés à l'objectif. |
| 2. Cohortes | `acquisition_funnel_state` | Cohorte = mois Toronto de `created_at`; une étape jamais horodatée dans toute la table = « inconnu » (pas 0 %). `paid_at`/`activated_at` = horodatages déclarés, pas preuve. Jointure aux entreprises vérifiées affichée, avec activations vérifiées sans ligne de cohorte. Instantané `current_stage` affiché séparément. |
| Journal d'activation | `activation_flow_events` | Événements ≠ identités uniques; événements sans identité comptés à part. |
| 3. Demande non servie | `alex_no_match_cases` + `alex_waitlist_requests` | Service/ville normalisés (accents, casse). Exclus : synthétiques (`e2e_test` ou id de session `e2e/test/qa/synthetic/demo`), statuts résolus. Identité = utilisateur ou session; même identité dans les deux sources = une demande. Sans identité = événement seulement. `alex_no_match_cases` n'a pas de statut : résolution « non suivie ». |

Non lisible par l'administration : `pricing_payment_events` (RLS service seulement; 0 ligne au 2026-11-07). `acq_payment_events`, `acq_subscriptions`, `unpro_payment_activation_audit` : 0 ligne, non utilisées dans le calcul. `v_ai_revenue_proof` : 4 sessions 350 $ ouvertes/non payées, aucune preuve qualifiée.

## Constats en lecture seule (2026-11-07, agrégats)
- **Entreprises 350 $ vérifiées LIVE : 0 / 3 000, 0,00 $ avant taxes.** Aucune session Checkout LIVE payée dans les journaux. Écart 3 000; 55 jours restants (7 nov.–31 déc.); rythme requis ≈ 54,5/jour; observé 0.
- Exclus : 14 sessions payées TEST (dont une avec droit 350 $ TEST); 2 anciennes sessions payées sans livemode (inconnu : 149 $ promo, 1 $ activation 7 j); 0 remboursement/contestation reçu; 0 événement dupliqué. Les seuls événements LIVE sont 4 `customer.subscription.updated`.
- Autres offres payées LIVE : 0.
- Cohortes : 416 prospects, 6 mois (juin–nov. 2026), aucun doublon. Contacté, livré, ouvert, clic, profil : jamais instrumentés → inconnus. Inscrits 51; payé déclaré 4; activé déclaré 14 (horodatages, non preuve). 372/416 identifiants de cohorte absents de `contractors` (identifiants de prospects) : jointure aux paiements incomplète.
- Instantané au 2026-11-07 : scraped 365, registered 30, active 21.
- Journal d'activation : 78 événements; `webhook_received` 49 sans identité; `stripe_payment_succeeded` 19 événements / 7 identités (TEST surtout, non preuve).
- Demande non servie : 1 demande unique (plomberie · Montréal, 2 événements dans les deux sources, 7 avril 2026); aucune exclusion synthétique/résolue.

## Limites
- Ne certifie pas un revenu réglé : seuls les journaux reçus sont lus; un webhook LIVE non reçu reste invisible (« inconnu » côté Stripe non interrogé).
- Les comptes QA sont exclus par livemode TEST et marqueurs de métadonnées; aucun croisement par courriel.
- Rendu mobile vérifié par tests d'états seulement; aucune session admin hébergée disponible pour une capture navigateur connectée.
