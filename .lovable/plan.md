## Problème
E2E étape 1/14 (`create_synthetic_contractor`) plante : l'insert utilise `name`, mais la table `public.contractors` n'a pas cette colonne — c'est `business_name`. De plus, `user_id` est `NOT NULL` et n'est pas fourni. Résultat : Overall capé à 70, Autopilot bloqué.

## Fix (1 fichier)
`supabase/functions/acq-e2e-real/index.ts` — étape 1 (lignes 94-100) :

```ts
const synthUserId = crypto.randomUUID();
const { error } = await sb.from("contractors").insert({
  id: synthId,
  user_id: synthUserId,
  business_name: `E2E ${slug}`,
  email: `${slug}@unpro.test`,
  phone: "+15555550100",
  city: "Montréal",
  account_status: "test",
  onboarding_status: "synthetic",
  activation_status: "synthetic",
});
```

Pas de FK sur `user_id` (vérifié) → uuid aléatoire OK. Le delete final (ligne 235) nettoie déjà la ligne par `id`.

## Validation
1. Redéployer `acq-e2e-real`.
2. Cliquer **Run E2E (14)** → étape 1 doit passer (`ok`).
3. Overall remonte au-dessus de 70 si les autres étapes passent ; Autopilot se débloque si ≥ 95.

Aucun autre changement (UI, schéma, RLS) — c'est un bug de payload côté edge function.