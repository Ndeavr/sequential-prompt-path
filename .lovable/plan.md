1. CONTEXTE
UNPRO.CA/admin redirige vers /login quand aucune session n’est présente. Après connexion, l’utilisateur voit parfois “Page non disponible”, ce qui indique un échec de reconnaissance du rôle admin ou une route admin protégée qui tombe dans le fallback. Le backend Lovable Cloud est sain; le problème est côté routage/auth client publié.

2. OBJECTIVE
Fixer /admin pour qu’un compte admin connecté charge toujours le cockpit admin publié, sans boucle “Chargement…”, sans fallback “Page non disponible”, et avec un état de diagnostic clair si l’accès admin échoue.

3. USERS
- Admin UNPRO
- Fondateur/opérateur qui doit diagnostiquer scraper, outbound, logs et retrys

4. DELIVERABLES
- Corriger la protection admin dans `ProtectedRoute` pour gérer proprement production, timeout et fallback direct sur `user_roles`.
- Corriger les routes admin encore protégées par `UniversalRouteGuard` pour utiliser le même garde admin fiable ou ajouter le même fallback admin.
- Ajouter un écran d’accès refusé admin utile au lieu d’un fallback générique quand l’utilisateur connecté n’a pas le rôle admin.
- Garder le redirect vers `/login` uniquement quand aucune session n’existe.
- Valider `/admin` et `/admin/outbound/logs` en preview/published path.

5. LOGIC
- Si non connecté: sauvegarder l’intention `/admin`, rediriger vers `/login`.
- Si connecté: vérifier les rôles via `useAuth`.
- Si `useAuth` tarde ou échoue: lancer une vérification directe de `user_roles` avec `supabase.auth.getSession()`.
- Si rôle admin trouvé: afficher l’admin immédiatement.
- Si rôle admin absent: afficher un écran “Accès administrateur requis” avec retour accueil/déconnexion, jamais “Page non disponible”.
- Si erreur réseau temporaire: afficher un état de retry/diagnostic au lieu de rester bloqué.

6. DATA
- Lire seulement `user_roles` côté client pour l’utilisateur courant.
- Ne pas modifier le schéma si les politiques actuelles permettent déjà à un utilisateur de lire ses propres rôles.
- Ne pas exposer les rôles d’autres utilisateurs.

7. UI/UX
- État de chargement court et explicite: “Validation de l’accès administrateur…”.
- État refusé premium, clair, actionnable.
- Aucune page morte.
- Mobile-first pour l’accès admin depuis téléphone.

8. COMPONENTS
- Refactor `ProtectedRoute` pour un helper admin stable.
- Option: créer `AdminAccessDenied` réutilisable.
- Mettre à jour les routes admin qui utilisent `UniversalRouteGuard allowedRoles={["admin"]}` ou aligner `UniversalRouteGuard` sur la logique admin robuste.

9. ACTIONS
- Implement fallback admin fiable.
- Normalize access denial.
- Preserve return path through login.
- Verify `/admin`, `/admin/outbound/logs`, `/admin/sms-debug`.
- Publish/update frontend après changement.

10. CONSTRAINTS
- Ne pas modifier `src/integrations/supabase/client.ts` ni `types.ts`.
- Ne pas changer OAuth/CORS/redirect URI si le problème est uniquement client.
- Ne pas rendre l’admin public.
- Ne pas stocker le statut admin dans localStorage/sessionStorage.
- Garder la validation serveur via `user_roles`.

11. SUCCESS
- `https://unpro.ca/admin` charge le dashboard admin après connexion.
- Un admin ne tombe plus sur “Page non disponible”.
- Les pages `/admin/...` critiques partagent le même comportement fiable.
- Un non-admin connecté voit un refus clair, pas une boucle ni une route fallback.
- Les logs navigateur ne montrent pas d’erreur bloquante de routage/admin.

12. TASKS
- Refactor `ProtectedRoute` pour stabiliser `adminFallback` et éviter l’état infini.
- Refactor `UniversalRouteGuard` pour reconnaître les rôles admin via liste complète/fallback direct, ou remplacer ses routes admin par `ProtectedRoute`.
- Ajouter/brancher un composant `AdminAccessDenied`.
- Tester les routes admin principales.
- Demander un publish/update frontend final.