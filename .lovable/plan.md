
## Goal
Unifier toutes les saisies d'adresses sur la plateforme avec **vérification Google Places obligatoire**. Une seule étape : on tape, on choisit dans la liste, et tous les champs (ville, province, code postal, lat/lng) sont remplis automatiquement et verrouillés. Plus jamais demander la ville/province/code postal séparément.

## Audit rapide

Champs adresse trouvés dans le projet :
1. `src/components/property/PropertyForm.tsx` — formulaire "Nouvelle propriété" (capture d'écran) → 5 champs séparés
2. `src/components/onboarding/FormPropertyQuickAdd.tsx` — onboarding propriétaire → 4 champs séparés
3. `src/components/property/GooglePlacesInput.tsx` — déjà refactorisé sur edge function (bonne base)
4. `src/components/rep-onboarding/StepSeedCapture.tsx` — entrepreneur (pas d'adresse, ok)
5. Plusieurs autres surfaces (booking, condo, emergency) à harmoniser

## Architecture cible

### 1. Composant unique : `AddressVerifiedInput`
Un seul composant React partout. API simple :

```tsx
<AddressVerifiedInput
  value={form.verifiedAddress}
  onChange={(verified) => setForm({ ...form, verifiedAddress: verified })}
  required
  label="Adresse"
/>
```

**Comportement :**
- Un seul champ visible : "Tapez votre adresse"
- Autocomplete via `google-places-autocomplete` (edge function existante)
- L'utilisateur **doit** sélectionner une suggestion → état `verified: true`
- Si l'utilisateur tape sans sélectionner → état `verified: false` → bloque le submit
- Une fois vérifié : badge vert "✓ Adresse vérifiée" + petit récap (ville, province, code postal) en read-only sous le champ
- Bouton "Modifier" pour repartir à zéro

**Type retourné :**
```ts
type VerifiedAddress = {
  verified: true;
  placeId: string;
  fullAddress: string;
  streetNumber: string;
  streetName: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
} | { verified: false; raw: string };
```

### 2. Edge function : enrichir `google-places-autocomplete`
Ajouter un mode `details` qui retourne tous les composants structurés (street_number, route, locality, administrative_area_level_1, postal_code, geometry). Probablement déjà présent — à vérifier et compléter au besoin.

### 3. Migration des formulaires
Remplacer les blocs adresse multi-champs par `<AddressVerifiedInput />` dans :
- `PropertyForm.tsx` → supprimer Adresse, Ville, Province, Code postal → 1 seul champ
- `FormPropertyQuickAdd.tsx` → idem
- Vérifier autres surfaces (booking, condo onboarding, emergency)

### 4. Validation côté serveur (RPC)
Ajouter une RPC `rpc_validate_address_verified(place_id, lat, lng)` qui re-confirme que `place_id` existe via Google Places (cache 30 jours). Empêche de bypasser le front. Appelée dans `createProperty` côté service.

### 5. Garde-fou DB
- Colonne `properties.address_verified boolean default false`
- Colonne `properties.google_place_id text`
- Trigger : refuser INSERT/UPDATE si `address_verified = false` (sauf admin)

## Ce que ça change pour l'utilisateur

**Avant :** 5 champs à remplir, erreurs de saisie, doublons "Montréal" / "Montreal" / "MTL"
**Après :** 1 champ, suggestions live, données 100% normalisées

```text
┌─────────────────────────────────────┐
│ Adresse *                           │
│ ┌─────────────────────────────────┐ │
│ │ 📍 128 78e Avenue, Laval, QC... │ │
│ └─────────────────────────────────┘ │
│   ✓ Adresse vérifiée                │
│   Laval, QC H7V 3K1                 │
│   [Modifier]                        │
└─────────────────────────────────────┘
```

## Lots de livraison

**Lot 1 — Composant + edge function**
- Audit `google-places-autocomplete` (champs retournés)
- Créer `src/components/address/AddressVerifiedInput.tsx`
- Créer hook `useAddressAutocomplete.ts`
- Type `VerifiedAddress` dans `src/types/address.ts`

**Lot 2 — Migration formulaires propriété**
- `PropertyForm.tsx` : remplacer 5 champs par 1
- `FormPropertyQuickAdd.tsx` : idem
- Adapter `useCreateProperty` / `propertyService.createProperty` pour accepter `VerifiedAddress`

**Lot 3 — Garde-fou DB**
- Migration : `address_verified`, `google_place_id` sur `properties`
- Trigger de validation
- Adapter le service pour passer `place_id`

**Lot 4 — Audit autres surfaces**
- Recensement complet (booking, condo, emergency, contractor onboarding)
- Migration au cas par cas

## Questions

1. **Scope du lot 1+2** : on commence par les 2 formulaires propriété (PropertyForm + FormPropertyQuickAdd) puis on étend, OK ?
2. **Garde-fou DB (lot 3)** : on bloque côté trigger toute adresse non vérifiée, ou on laisse en "warning" pour les imports admin/legacy ?
3. **Champ unité/appartement** : on garde un petit champ optionnel "App. / Unité" séparé après le champ vérifié (Google ne le capture pas toujours) ?
