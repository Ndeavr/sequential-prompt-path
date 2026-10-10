# Offre entrepreneur 350 $ — reprise (phase 1)

## Ce qui existe déjà (réutilisé, rien de parallèle)
- Calcul serveur du devis (`compute-pricing-quote`) avec un mode « pack 350 $ » et des frais de profil de 350 $ configurables.
- Le paiement Stripe côté serveur (`create-checkout-session`) et la confirmation par webhook signé, idempotente (`stripe-webhook`).
- L'offre de repli « crédit 350 $ » et l'offre fondateur. Elles restent intactes.
- La page du plan personnalisé (`/entrepreneur/plan-personnalise/:id`), qui est l'étape 3 du parcours actuel.
- Le chantier ouvert sur le chat mobile reste à faire. Il n'est pas touché ici.

## Ce qui sera fait
1. **Carte principale « Activer mon profil — 350 $ »** sur le plan personnalisé, pour un nouvel entrepreneur sans droit gratuit ni fondateur. La carte contient :
   - le profil ;
   - 12 mois de Présence IA, présentés comme une valeur de 588 $ (12 × 49 $, prix Présence du catalogue) ;
   - le nombre exact de rendez-vous garantis par le devis serveur. Si le serveur ne peut rien garantir, la carte affiche « Analyse du territoire requise » et aucun chiffre.
   - La mention « Paiement unique. Aucun abonnement. »
2. **Bouton secondaire « J'aimerais plus de rendez-vous dès maintenant »**. Il ouvre un choix 5 / 10 / 20 / Autre par mois. Le serveur recalcule alors un forfait à partir des données déjà connues (métier, territoires, capacité), sans rien redemander.
   - Si un forfait est trouvé : la page affiche le prix mensuel, la ligne « Activation 350 $ incluse dans le premier paiement », et deux boutons : « Activer mon forfait » et « Continuer avec l'offre à 350 $ ».
   - Si aucun prix n'est confirmé pour ce volume : la page affiche « Analyse requise ». Aucun prix n'est inventé.
3. **Pas de double facturation**. Le premier paiement d'un forfait supérieur = mensualité du forfait. Les 350 $ d'activation sont comptés dedans, pas ajoutés en plus. Ce calcul est fait côté serveur seulement.
4. **Consentement à l'abonnement**. Une case à cocher obligatoire, avec ce texte : « J'accepte un prélèvement mensuel de X $ jusqu'à annulation. » Sans elle, le paiement ne démarre pas. Le serveur refuse aussi tout abonnement si le consentement n'a pas été enregistré.
5. **Mise en service**. Le compte n'est activé que sur confirmation du webhook Stripe : profil publié en attente de vérification, 12 mois de Présence IA, rendez-vous garantis enregistrés. L'URL de retour ne suffit jamais à activer un compte.
6. **Promotions déjà accordées respectées**. Les droits gratuits, fondateur ou 3 RDV gratuits passent avant tout. Ces entrepreneurs ne voient jamais la carte 350 $.

## Tests
- Tests ciblés :
  - choix de l'offre selon l'admissibilité ;
  - absence de chiffre sans garantie serveur ;
  - montant du premier paiement sans double facturation ;
  - consentement obligatoire ;
  - webhook rejoué → une seule activation.
- Contrôle des types et build.
- Session Stripe en mode TEST seulement, avec le compte QA. Si je ne peux pas me connecter à ce compte, je m'arrête là et je le signale.

## Points à confirmer (hypothèses retenues si pas de réponse)
- 350 $ couvre 12 mois de Présence IA, qui remplacent les 6 mois de l'ancien pack. Le plafond de rendez-vous reste celui que le serveur calcule.
- Les forfaits 5 / 10 / 20 utilisent la grille mensuelle actuelle du calculateur. Aucun nouveau tarif n'est créé.

## Détails techniques
- `compute-pricing-quote` : ajout de `entry_offer` (350 $, 12 mois, `guaranteed_appointments` serveur) et de `upgrade_quote(volume)`, qui renvoie `first_payment_cents = max(monthly, 35000)` avec `activation_included=true`.
- `create-checkout-session` : nouveaux modes `entry_350` (payment) et `upgrade_subscription`. Le mode abonnement exige `recurring_consent_at`, stocké dans le devis. Le premier paiement passe en crédit sur la facture : aucun `price_data` d'activation n'est ajouté.
- `stripe-webhook` : les branches `entry_350` et `upgrade_subscription` sont idempotentes via `shouldSkipRedelivery`.
- UI : uniquement la page du plan personnalisé, plus un panneau. Le texte vient de `src/lib/copy/offer350.ts`, mis à jour.
