# Diagnostic P0 — écran « Une erreur est survenue » sur unpro.ca

## Preuves obtenues (5 nov, ~21:55 UTC, lecture seule)
- Chromium neuf, cache vide, 8 chargements en ligne (`/`, `/entrepreneurs`, `/entrepreneurs/activation-350`, `/pricing/entrepreneurs`, en navigateur normal et avec un user-agent « HeadlessChrome ») : **les 8 pages s'affichent, aucune erreur JS, aucune erreur console, aucun écran d'erreur.**
- L'écran signalé est celui de `src/components/errors/AppErrorBoundary.tsx` (seul composant avec ce texte exact). Il intercepte toute erreur de rendu, sans afficher ni enregistrer la cause à l'écran.
- Constat du code : en cas de module JS introuvable, il recharge une fois via `sessionStorage`; si `sessionStorage` est **inaccessible** (fréquent dans les navigateurs d'extraction ou en mode privé strict), il abandonne et affiche l'écran d'erreur.

## Conclusion
- **Pas de crash production reproductible** à ce jour (même conclusion que les six contrôles précédents).
- **Hypothèse non prouvée** : artefact du navigateur TinyFish — stockage bloqué, modules JS mal chargés ou fonctionnalité navigateur absente. La cause exacte demande la stack, que nous n'avons pas.

## Correctif minimal proposé (non appliqué)
1. Fichier unique `src/components/errors/AppErrorBoundary.tsx` :
   - Dans `componentDidCatch`, envoyer nom, message et 1 000 premiers caractères de la stack via l'événement existant `lovable.client_error`/console, pour obtenir la vraie stack au prochain incident.
   - Ajouter un petit `<details>` « Détails techniques » avec `error.name` + message, sans données personnelles.
2. Facultatif après preuve seulement : si la stack confirme `SecurityError` sur le stockage, protéger l'accès fautif par try/catch. Aucune modification de prix, Stripe, auth, base ou landing.

## Validation
- Tests existants AppErrorBoundary/chunk au vert; nouveau test : une erreur simulée affiche nom/message et produit un log.
- Playwright sur les 4 routes : rendu normal, zéro erreur console.
- Relance TinyFish après publication : soit pages OK, soit message d'erreur exact visible pour corriger la cause réelle.

## Action immédiate sans code
Relancer TinyFish avec rendu JS complet et attente 5–8 s, ou capturer sa console. Si le texte « Détails techniques » est requis pour voir la cause, approuver ce plan.
