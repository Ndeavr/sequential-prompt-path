

# Module Upsell — Rendez-vous additionnels à la carte

## Contexte

Actuellement le funnel recommande un plan et redirige vers le checkout. Il n'y a aucune option pour acheter des rendez-vous supplémentaires au-delà de ce que le plan inclut. L'utilisateur doit pouvoir :
1. Voir un upsell "Besoin de plus de rendez-vous?" après la recommandation de plan
2. Ajouter un pack de RDV à son panier (plan + X rendez-vous)
3. Ou acheter à la carte sans plan (ex: 5 RDV pour 675$)

Les prix à la carte dépendent du domaine, sous-catégories, localisation et compétition — ils viendront du JVE (Job Value Engine) déjà en place via `get_avg_job_value()`.

## Plan

### 1. Créer la table `appointment_packs`
Stocker les packs disponibles et les achats à la carte.

```sql
CREATE TABLE appointment_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id uuid,
  pack_size integer NOT NULL,         -- 5, 10, 25, 50
  unit_price_cents integer NOT NULL,  -- prix unitaire par RDV
  total_price_cents integer NOT NULL, -- prix total du pack
  trade_slug text,
  city_slug text,
  source text DEFAULT 'checkout',     -- checkout | upsell | dashboard
  status text DEFAULT 'pending',      -- pending | paid | active | exhausted
  remaining integer NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE appointment_packs ENABLE ROW LEVEL SECURITY;
```

### 2. Créer `AppointmentUpsellCard.tsx`
Composant qui s'affiche dans `PlanRecommendationHero` (step 2 du funnel goals) et dans `PageCheckoutStripe`.

Contenu :
- Titre: "Besoin de plus de rendez-vous?"
- Sous-titre calculé: "Votre plan inclut X RDV/mois. Pour atteindre votre objectif, ajoutez Y rendez-vous."
- Packs dynamiques calculés via le JVE (`get_avg_job_value`) en se basant sur le trade/city du contractor:
  - 5 RDV → prix avec léger discount
  - 10 RDV → meilleur prix/unité
  - 25 RDV → prix volume
  - 50 RDV → prix entreprise
- Chaque pack montre: quantité, prix total, prix/RDV, % d'économie vs unitaire
- Sélection toggle (0 ou 1 pack à la fois)
- Option "À la carte" pour ceux sans plan

### 3. Intégrer dans le funnel

**Dans `PlanRecommendationHero.tsx`** — Ajouter `AppointmentUpsellCard` entre les "Ce qu'il débloque" et le "Position concurrentielle". Passer le `monthlyAppointments` calculé et le plan recommandé pour contextualiser le message.

**Dans `PageCheckoutStripe.tsx`** — Ajouter `AppointmentUpsellCard` entre le résumé du plan et la section "Après le paiement". Le pack sélectionné s'ajoute au total affiché et est envoyé au checkout Stripe comme line item additionnel.

**Dans `PageAlexGoalsStrategy.tsx`** — Propager la sélection de pack via `sessionStorage` (`unpro_appointment_pack`) pour que le checkout le récupère.

### 4. Logique de prix dynamique

Créer un helper `calculatePackPricing(tradeSlug, citySlug, packSize)` qui :
- Appelle `get_avg_job_value()` pour obtenir la valeur moyenne d'un RDV dans ce domaine/ville
- Applique un % de la valeur comme prix du RDV (ex: 15-25% de la valeur du contrat)
- Applique des réductions volume: 5 = 0%, 10 = -10%, 25 = -18%, 50 = -25%
- Retourne `{ unitPrice, totalPrice, savings }`

En attendant le branchement réel au JVE, utiliser des mock data réalistes basés sur le domaine.

### 5. Mise à jour du checkout

Dans `PageCheckoutStripe.tsx`:
- Lire `sessionStorage.getItem("unpro_appointment_pack")`
- Si un pack est sélectionné, afficher une ligne supplémentaire dans le résumé
- Mettre à jour le total affiché
- Envoyer le pack comme metadata au checkout Stripe pour traitement

### Fichiers à créer
- `src/components/goals/AppointmentUpsellCard.tsx`
- `src/lib/appointmentPricing.ts` (helper de calcul de prix)

### Fichiers à modifier
- `src/components/goals/PlanRecommendationHero.tsx` — insérer upsell
- `src/pages/checkout/PageCheckoutStripe.tsx` — afficher pack + total mis à jour
- `src/pages/goals/PageAlexGoalsStrategy.tsx` — propager pack en sessionStorage
- Migration DB pour `appointment_packs`

