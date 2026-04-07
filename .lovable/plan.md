
## Plan: Flux d'achat propriétaires complet

### Phase 1 — Stripe Products & Edge Function
1. **Créer produits Stripe** : "UNPRO Propriétaire Plus" ($49/an) et "UNPRO Propriétaire Signature" ($149/an)
2. **Edge function `create-homeowner-checkout`** :
   - Mode `subscription` annuel
   - Supporte guest checkout (pas besoin de compte avant paiement)
   - Support coupon/promo code
   - `success_url` → `/proprietaire/bienvenue?session_id={CHECKOUT_SESSION_ID}`
   - `cancel_url` → `/tarifs?tab=proprietaires`
   - Metadata: plan code, billing interval

### Phase 2 — UI Checkout Flow
3. **Modifier `HomeownerPlans.tsx`** : CTA "Passer à Plus" et "Activer Signature" → ouvrent un modal/drawer avec champ coupon code + bouton payer (appel edge function)
4. **Ajouter champ code promo** dans le flow avant redirect Stripe

### Phase 3 — Post-Payment Onboarding
5. **Page `/proprietaire/bienvenue`** : 
   - Vérifie le `session_id` Stripe
   - Si pas connecté → formulaire création de compte (email pré-rempli depuis Stripe session)
   - Si déjà connecté → lien vers login
   - Étapes post-achat : ajouter adresses, configurer Passeport Maison
6. **Edge function `verify-homeowner-payment`** : vérifie la session Stripe et retourne email + plan acheté

### Phase 4 — Database
7. **Table `homeowner_subscriptions`** : track les abonnements propriétaires séparément des entrepreneurs
8. **Route + routing** : ajouter les nouvelles pages

### Résumé du parcours
1. Propriétaire voit le prix → clique "Passer à Plus"
2. Modal avec champ coupon → "Procéder au paiement"
3. Redirect Stripe Checkout (guest OK)
4. Retour sur `/proprietaire/bienvenue`
5. Création de compte si nécessaire
6. Ajout d'adresses, configuration
7. Dashboard propriétaire actif
