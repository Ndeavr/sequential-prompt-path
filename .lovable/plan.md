## Diagnostic clair

Le backend répond correctement et le run ISR existe déjà avec les vraies données :
- Prospect ISR réel présent : Isolation Solution Royal, Terrebonne, `+15142499522`, `info@isroyal.ca`, `https://isroyal.ca`
- Run existant : `e4b60308-956c-49ed-9cc6-8bed4f8a98aa`
- Étapes 1 à 5 complétées : search, extraction, AIPP, page, SMS draft
- `list-live-runs` répond 200 avec le run et les étapes
- La page `/pro/isolation-solution-royal` est prête côté données

Le blocage visible vient du frontend : `/admin/live-runs` reste en état `Vérification… / En attente de validation admin…`, donc l’UI ne charge pas le run existant et masque l’état réel du pipeline.

## Objectif

Rendre `/admin/live-runs` opérable maintenant :
- Voir le run ISR existant dès l’ouverture
- Débloquer le bouton `Start ISR Live Run`
- Garder une validation admin sécurisée
- Permettre dry-run SMS, approbation SMS réelle, checkout 1$ sans placeholders
- Afficher les erreurs actionnables au lieu d’un écran d’attente

## Plan d’implémentation

### 1. Refactor auth admin de `PageAdminLiveRuns.tsx`

Remplacer le bootstrap fragile basé uniquement sur `supabase.auth.getSession()` par le store global déjà fiable :
- Utiliser `useAuth()` pour lire `user`, `isAuthenticated`, `isLoading`, `roles`, `isAdmin`
- Conserver `validateAdmin()` comme confirmation secondaire
- Ajouter une porte de secours sécurisée : si `roles` contient `admin` ou si `validateAdmin()` confirme, l’état passe immédiatement à `Admin validé`
- Supprimer l’état bloquant permanent `Vérification…`

Résultat : l’admin connecté ne reste plus coincé en attente.

### 2. Charger le run ISR même si la validation UI tarde

Modifier la logique de refresh :
- Déclencher `safeRefresh()` dès que l’utilisateur admin est confirmé
- Si `list-live-runs` réussit, afficher les données serveur
- Si `list-live-runs` échoue, utiliser le fallback table existant
- Si l’auth est encore en cours mais que l’utilisateur est connu, afficher un panneau `Connexion en cours` sans désactiver toute la page indéfiniment

Résultat : le run existant `e4b60308...` apparaît avec les étapes au lieu du message `En attente de validation admin…`.

### 3. Sécuriser le bouton `Start ISR Live Run`

Changer le comportement du bouton :
- Le bouton devient actif dès que l’admin est confirmé par `useAuth` ou `validateAdmin`
- Au clic, appeler `run-live-acquisition`
- Si un run existe déjà, le réutiliser et afficher `Run ISR prêt`
- Après clic, forcer un `safeRefresh()` et ouvrir automatiquement les étapes du run
- Afficher l’erreur exacte si l’appel échoue

Résultat : le bouton entouré dans la capture devient réellement opérable.

### 4. Améliorer l’état vide et les statuts

Remplacer les messages vagues par des états utiles :
- `Validation admin en cours…` uniquement pendant un délai court
- `Admin validé · chargement du run ISR…`
- `Run ISR prêt · SMS en attente d’approbation`
- `Sync ralentie · actions disponibles` si fallback actif
- `Action bloquée` seulement si rôle admin absent

Résultat : plus de page morte, le cockpit montre le statut réel du funnel.

### 5. Vérifier les edge functions déjà déployées

Tester après correction :
- `list-live-runs` retourne le run ISR
- `run-live-acquisition` retourne ou réutilise le run ISR
- `approve-isr-sms` garde la sécurité admin + format E.164 + confirmation prospect
- `create-isr-promo-checkout` retourne une URL Stripe 1$

Aucune migration requise.
Aucun SMS réel envoyé pendant la validation.
Aucune règle RLS affaiblie.

## Fichiers à modifier

- `src/pages/admin/PageAdminLiveRuns.tsx`
  - refactor auth state
  - refresh resilient
  - UI cockpit non bloquante
  - ouverture automatique du run ISR

Aucun changement prévu dans :
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `.env`
- migrations

## Critères de succès

- `/admin/live-runs` affiche `Admin validé`
- Le run ISR existant apparaît sans cliquer
- `Start ISR Live Run` fonctionne et ne reste plus bloqué
- Le SMS preview est visible
- `Dry-run SMS` reste sécurisé vers le numéro admin
- `Approuver & envoyer` exige le numéro exact `+15142499522`
- `Checkout 1$` ouvre Stripe
- Le cockpit montre les étapes search → extracted → AIPP → page → sms_drafted
- Aucun placeholder mock n’est affiché
- Les pages existantes ne sont pas touchées