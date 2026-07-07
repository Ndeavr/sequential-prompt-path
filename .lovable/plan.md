## Objectif

Éliminer l'ambiguïté du checkout d'activation 7 jours pour lever le blocage de conversion vers la première vente.

## Décision

Adopter l'option recommandée par l'utilisateur : garder l'activation comme **paiement unique de 1 $ (aucun renouvellement)**, et faire choisir le plan pendant l'onboarding après paiement. Cela supprime la confusion « quel plan me sera facturé au jour 8 ? ».

Techniquement, c'est déjà le cas côté Stripe (`mode: "payment"`, one-time price), mais rien ne le dit clairement à l'utilisateur. On rend cette promesse visible partout.

## Changements

### 1. Landing `/isolation-qc` — bloc récap prix avant le CTA
Fichier : `src/pages/pro/PageProIsolationQC.tsx`

Ajouter, juste au-dessus du bouton « Activer mon essai », un encadré :

```
Aujourd'hui              1,00 $ + taxes
Après 7 jours            Aucun prélèvement automatique
                         Vous choisirez votre plan pendant l'essai

✓ Profil IA activé
✓ Recommandations propriétaires  
✓ Rendez-vous exclusifs
✓ Annulation en 1 clic — aucun frais caché
```

Micro-copie sous le CTA : « Paiement unique de 1 $. Aucun renouvellement automatique. »

### 2. Stripe Checkout — libellé + description explicites
Fichier : `supabase/functions/create-activation-checkout/index.ts`

- Remplacer `line_items: [{ price: ACTIVATION_PRICE_ID }]` par un `price_data` inline pour contrôler le libellé produit affiché sur Stripe :
  - `product_data.name` : `"UNPRO — Activation 7 jours (paiement unique)"`
  - `product_data.description` : `"1 $ aujourd'hui. Aucun renouvellement automatique. Vous choisirez votre plan pendant l'essai."`
  - `unit_amount: 100`, `currency: "cad"`
- Ajouter `payment_intent_data.description` identique pour le relevé bancaire / reçu.
- Ajouter `custom_text.submit.message` : `"Paiement unique de 1 $ CA. Aucun abonnement créé."`
- Garder `locale: "fr"`, `mode: "payment"`.

Note : on garde le même `ACTIVATION_PRICE_ID` comme fallback commenté, mais on privilégie `price_data` pour maîtriser la copie sans passer par le dashboard Stripe.

### 3. Page succès — confirmer le message
Fichier : `src/pages/scan-ia/PageScanIAActivationSuccess.tsx` (ou route équivalente `/activation-success`)

Vérifier / ajuster le texte de succès pour dire : « Essai activé. Aucun renouvellement automatique — vous choisirez votre plan pendant les 7 prochains jours. » (À confirmer selon la page réellement rendue par `/activation-success`.)

### Hors périmètre (volontairement)

- Pas de conversion vers un vrai `mode: "subscription"` avec trial → renouvellement automatique. La demande utilisateur privilégie l'option « aucune confusion de plan ».
- Pas de calcul de taxes dans Stripe (activer `automatic_tax` demanderait de configurer Stripe Tax côté compte — à traiter dans un sprint séparé). La mention « + taxes » reste sur la landing ; le montant Stripe reste 1,00 $ CA net.
- Pas de refonte du flow d'onboarding post-paiement — le prompt « Choisissez votre plan » sera un ticket suivant si absent.

## Vérification

1. `curl` la fonction déployée → session Stripe créée avec le nouveau libellé.
2. Ouvrir l'URL Stripe → vérifier que le nom du produit, la description et le message de soumission correspondent.
3. Charger `/isolation-qc` mobile 384px → bloc récap visible au-dessus du CTA.
