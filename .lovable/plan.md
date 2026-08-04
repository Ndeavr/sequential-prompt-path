# Réparer la connexion Google (échec après la fenêtre de consentement)

## Symptôme

La fenêtre Lovable "Grant permission to Build & Refine Flow" s'ouvre (donc le bouton et le courtier OAuth fonctionnent), mais la connexion n'aboutit pas: aucune session n'est créée et l'app reste sur `/login`.

## Ce qui est confirmé

- Le bouton appelle bien `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })` — approche correcte.
- La liste d'URL autorisées du projet couvre `unpro.ca`, l'aperçu `id-preview--…lovable.app` et le domaine publié: le retour n'est donc pas bloqué par l'allow-list.
- Les logs console au chargement montrent `INITIAL_SESSION null` sans aucun événement d'authentification: rien n'arrive jusqu'au client après le consentement.

Cause non confirmée à ce stade: la piste la plus probable est que le fournisseur Google n'est plus activé côté authentification du backend (le courtier consent, mais l'échange de jeton échoue), le reste étant du diagnostic.

## Plan

1. Diagnostic (avant toute modification)
   - Relire la configuration des méthodes de connexion et l'état du fournisseur Google.
   - Rejouer une vraie tentative de connexion dans un navigateur piloté et capturer: erreur retournée par le courtier, contenu de `result.error`, URL finale, et journaux d'authentification côté backend.

2. Correctif fournisseur
   - Réactiver/reconfigurer la connexion sociale Google en identifiants gérés (outil de configuration social login), sans toucher aux autres méthodes actives.

3. Correctif application (uniquement si le diagnostic le montre)
   - Rendre l'échec visible au lieu de silencieux: afficher le message d'erreur réel du courtier dans le toast et le consigner via `authDebug`.
   - Traiter le cas "jetons reçus mais `setSession` échoue" en surfaçant l'erreur au lieu de rester bloqué sur "Connexion…".

4. Vérification end-to-end
   - Connexion réelle depuis `/login`: la session est créée, la redirection suit l'intention (`consumeAuthIntent` / rôle), et `/login` ne rebondit plus.
   - Vérifier les journaux d'authentification: un événement de connexion Google apparaît bien.

## Portée

Aucune modification hors du parcours de connexion: pas de changement SEO, pipeline d'acquisition, CRM, ni schéma de base de données.

## Détails techniques

- Fichiers concernés au maximum: `src/components/auth/OAuthButtons.tsx` (remontée d'erreur), éventuellement `src/pages/Login.tsx` (état d'échec).
- `src/integrations/lovable/index.ts` est auto-généré: non modifié manuellement.
- Le fournisseur est configuré via l'outil de configuration de connexion sociale, pas par du code.
