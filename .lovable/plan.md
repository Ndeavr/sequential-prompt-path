Constat vérifié

- Le compte `yturcotte@gmail.com` a bien le rôle `admin` en base, en plus de `contractor` et `homeowner`.
- La fonction serveur `has_role(user, admin)` retourne `true` pour ce compte.
- Donc le problème n’est pas un manque de permission backend. C’est un problème de routage/état côté app après connexion.

Problème probable

Il y a plusieurs propriétaires de redirection après login :

1. `AuthReturnRouter` consomme l’intention de retour vers `/admin/outbound/test-center`.
2. `LoginPageUnpro` consomme aussi l’intention et peut rediriger ailleurs si l’autre l’a déjà prise.
3. `ProtectedRoute` peut rediriger vers `/onboarding` si le rôle admin n’est pas encore résolu au moment exact du rendu.
4. Le rôle actif stocké en session peut rester sur `homeowner`, ce qui cache les fonctions/admin menus même quand le rôle admin existe.

Plan de hotfix isolé

1. Corriger uniquement le flux post-login

Fichier : `src/pages/LoginPageUnpro.tsx`

- Ne plus consommer l’intention auth si `AuthReturnRouter` l’a déjà prise.
- Attendre que le rôle soit résolu avant de rediriger un utilisateur déjà connecté.
- Remplacer le fallback actuel `/` par `getDefaultRedirectForRole(role)`.
- Résultat attendu : un admin connecté ne retombe plus sur `/`, `/onboarding` ou un écran propriétaire par défaut.

2. Prioriser admin dans le callback OAuth

Fichier : `src/pages/AuthCallbackPage.tsx`

- Dès que `roleList` contient `admin`, rediriger vers :
  - l’intention sauvegardée si elle existe, ex. `/admin/outbound/test-center`
  - sinon `/admin`
- Ne jamais soumettre un admin à la logique `onboarding_completed`.
- Résultat attendu : admin = accès admin immédiat, même si le profil/onboarding est incomplet ou lent à charger.

3. Bloquer la boucle dans les routes protégées admin

Fichier : `src/components/ProtectedRoute.tsx`

- Pour `requiredRole="admin"`, ne pas rediriger vers `/onboarding` quand le rôle est encore `null` ou en résolution.
- Garder un écran de vérification de rôle tant que l’app n’a pas une réponse claire.
- Rediriger seulement si un rôle non-admin est réellement confirmé.
- Résultat attendu : plus de boucle login → onboarding → login pour `/admin/outbound/test-center`.

4. Restaurer les fonctions admin dans la navigation

Fichiers :
- `src/hooks/useAuth.ts`
- `src/contexts/ActiveRoleContext.tsx`

Changement minimal :

- Exposer la liste complète des rôles depuis `useAuth`, pas seulement le rôle primaire.
- Priorité conservée : `admin > contractor > condo_manager > homeowner`.
- Si l’utilisateur a `admin`, le rôle actif par défaut redevient `admin` au login, même si une ancienne session avait stocké `homeowner`.
- Résultat attendu : les menus/fonctions admin réapparaissent pour `yturcotte@gmail.com`.

Ce que je ne touche pas dans ce hotfix

- Pas de changement à Google OAuth.
- Pas de changement au logout.
- Pas de changement à `PageOutboundTestCenter.tsx`.
- Pas de changement aux fonctions outbound.
- Pas de migration base de données, car le rôle admin existe déjà et les politiques RLS sont correctes.

Vérification après changement

Checklist courte :

1. Se connecter avec Google comme `yturcotte@gmail.com`.
2. Ouvrir directement `/admin/outbound/test-center`.
3. Confirmer que la page Test Center s’affiche.
4. Confirmer que les boutons/actions admin restent visibles.
5. Rafraîchir la page sur `/admin/outbound/test-center`.
6. Confirmer qu’il n’y a pas de redirection vers `/login`, `/onboarding`, `/dashboard` ou `/pro`.
7. Déconnexion puis reconnexion : même résultat.

Rollback/failsafe

- Les changements sont limités aux fichiers auth/routing ci-dessus.
- Si une régression apparaît, on revient uniquement sur ce hotfix via l’historique, sans toucher au reste du produit.