# Correctifs urgents : activation par SMS et connexion Google

## Ce qui a été vérifié en production (avant tout correctif)

Activation `/unpro/activate/:token` — **le parcours répond correctement aujourd'hui** :

- La route existe dans le code et **est présente dans le bundle publié** sur `unpro.ca`.
- Le résolveur de jeton répond en accès anonyme (aucun blocage d'authentification) : testé avec un jeton réel envoyé par SMS ce matin (Isolation JTL Inc.) → réponse valide avec l'entreprise, la ville et la catégorie.
- Les jetons des SMS envoyés aujourd'hui (Plomberie A+, Nael Construction, Couvreur Couv-Toit…) existent bien en base.
- Ouverture réelle de la page en navigateur : elle s'affiche et appelle bien le résolveur. Un jeton inexistant affiche « Ce lien d'activation n'est plus valide », pas « Page non disponible ».

Conclusion : « Page non disponible » est le **404 interne de l'application** (`PageSafeFallbackRedirect`). Il ne peut apparaître que si le navigateur du contractant exécute une **version en cache antérieure à l'ajout de la route** (service worker / PWA) ou si le lien a été tronqué autrement. Cause encore **non confirmée** — première étape du plan : la confirmer, sans supposition.

Connexion Google — **cause confirmée côté fournisseur** :

- L'erreur `#error=server_error&error_description=failed+to+sign+in+with+vendor` est renvoyée par le service d'authentification lui-même, après le consentement Google : l'échange de jeton avec Google échoue (identifiants OAuth invalides ou URL de redirection non reconnue côté Google).
- Le fournisseur Google est bien activé (vérifié sur la configuration d'authentification en direct).
- Côté application, **aucune gestion de cette erreur** : le hash `#error=…` arrive sur la page d'accueil et personne ne le lit. L'utilisateur voit simplement une page normale, sans explication.

## Plan

### 1. Activation : confirmer et éliminer la cause du 404

- Reproduire le 404 en simulant un cache ancien (service worker) et vérifier si la navigation retombe sur une version pré-route.
- Exclure `/unpro/activate/*` de tout fallback/cache de navigation du service worker et forcer l'invalidation du cache au déploiement.
- Journaliser précisément chaque atterrissage sur la page de repli 404 avec le chemin exact, afin de distinguer « lien tronqué » de « bundle périmé ».
- Rendre la page d'activation résiliente au lien tronqué : si le jeton est introuvable, tenter une résolution par préfixe côté fonction (jeton unique) avant de déclarer le lien invalide, et afficher la raison exacte renvoyée par le serveur.

### 2. Connexion Google : remettre le fournisseur en identifiants gérés

- Reconfigurer la connexion sociale Google en identifiants gérés par la plateforme (l'échec `failed to sign in with vendor` provient de cet échange), sans toucher aux autres méthodes actives.
- Vérifier ensuite, en direct, la configuration d'authentification : URL du site, liste des URL de redirection autorisées (`unpro.ca`, `www.unpro.ca`, domaine publié, aperçu), état du fournisseur.

### 3. Rendre l'échec visible au lieu de silencieux

- Ajouter un lecteur d'erreur d'authentification au démarrage de l'application : lecture du hash et de la query (`error`, `error_code`, `error_description`), redirection vers `/login` avec le message **exact** du serveur affiché à l'écran, et consignation dans le journal d'authentification interne.
- Remonter l'erreur réelle du fournisseur dans le bouton Google (aujourd'hui remplacée par un message générique).
- Journaliser chaque étape : initiation, redirection, retour, échange de session, session obtenue.

### 4. Test bout-en-bout de production

Scénario unique exécuté en navigateur piloté, sans nouvel envoi de SMS de masse :

1. Prendre un jeton réellement envoyé aujourd'hui.
2. Ouvrir `unpro.ca/unpro/activate/:token` → vérifier l'affichage de l'entreprise et l'enregistrement du clic.
3. Lancer le paiement 1 $ → vérifier la création de la session Stripe avec les métadonnées d'attribution.
4. Effectuer une connexion Google réelle → session créée, redirection vers la destination d'origine.
5. Vérifier la réconciliation dans le suivi de funnel : envoyé → livré → cliqué → payé.

Le test est consigné comme scénario rejouable pour les prochains lots.

## Portée

Aucune modification du SEO, des sitemaps, du corpus IA ni des systèmes de contenu. Aucun envoi de nouvelle campagne SMS dans ce lot.

## Détails techniques

- Fichiers touchés : `src/components/auth/OAuthButtons.tsx`, un nouveau lecteur d'erreur d'auth monté dans `src/app/App.tsx`, `src/pages/Login.tsx` (état d'échec visible), `src/pages/activation/PageUnproActivate.tsx` (raison exacte affichée), `supabase/functions/activation-token-resolve/index.ts` (résolution par préfixe + journalisation), configuration du service worker.
- Le fournisseur Google se reconfigure par l'outil de connexion sociale, pas par du code ; `src/integrations/lovable/index.ts` reste auto-généré.
- Aucune migration de base de données requise.
