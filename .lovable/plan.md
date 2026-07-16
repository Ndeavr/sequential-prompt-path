## Objectif

Faire le ménage complet du menu admin. Aujourd'hui il y a **319 routes `/admin/*`** définies dans le router mais seulement **68 liens** exposés dans `src/config/adminNav.ts` — plus la page `/admin/affiliates/assign` que j'ai créée hier n'apparaît nulle part dans le menu (d'où le "Page non disponible" quand tu tapes l'URL sur unpro.ca — la nouvelle version n'est simplement pas encore publiée).

## Plan d'action

### 1. Audit automatisé (script one-shot, non commité)
- Extraire les 319 chemins `/admin/*` du `router.tsx`.
- Extraire les 68 liens de `adminNav.ts`.
- Produire trois listes dans `docs/admin-links-audit.md` :
  - **Liens du menu → route manquante** (menu cassé)
  - **Route existante → non liée** (orphelines, potentiellement utiles)
  - **Route existante → composant vide/legacy** (à supprimer)

### 2. Réparer les liens cassés du menu
Corriger dans `adminNav.ts` tout lien qui pointe vers une route inexistante (redirection ou suppression).

### 3. Refondre les 6 sections en un menu à valeur immédiate
Nouveau menu resserré autour de ce qui fait vraiment gagner de l'argent aujourd'hui :

```text
Business       → Dashboard · Revenue · Appointments · Launch War Room
Affiliates ⭐  → War Room · Assign Prospects · Commissions · Proposals
Contractors    → Prospects · Qualification · Activation · Active Members · Import
Growth         → Campaigns · Emails · SMS · Pipeline · Acquisition Health
Alex           → AI Agents · Voice Lab · Knowledge Base · Prompt Rules
System         → Alerts · Health · Logs · Settings · Kill Switch · Usage Analytics
Labs (hidden)  → tout le reste (Omega, Predictive, Brand, Outbound deep, etc.)
```

Ajouter la nouvelle section **Affiliates** avec :
- `/admin/affiliates` (War Room affilié)
- `/admin/affiliates/assign` (assignation prospects)
- `/admin/affiliates/commissions` *(à créer plus tard)*
- `/admin/affiliates/proposals` *(à créer plus tard)*

### 4. Marquer les routes vraiment mortes
Pour les routes orphelines qui pointent vers un composant vide, un doublon, ou une page cassée : ajouter un commentaire `// TODO: remove` dans `router.tsx` (sans supprimer, pour éviter les régressions). Suppression réelle dans un deuxième tour après validation.

### 5. Rappel important
La page que tu viens de tester est sur **unpro.ca** (production publiée). Les changements récents (`/admin/affiliates/assign`) ne seront visibles qu'après **Publish**. Je ne peux pas "faire fonctionner" une route en production sans publication.

## Détails techniques

- Aucun changement de logique backend/RLS dans ce tour — pur nettoyage frontend (`adminNav.ts` + doc).
- L'audit se fait via un script Node one-shot qui parse `router.tsx` en regex et compare à `adminNav.ts`.
- Le fichier `docs/admin-links-audit.md` sert de source de vérité pour les prochains cycles de ménage.
- Aucune route n'est supprimée dans ce tour : uniquement ajout/déplacement/commentaire.

## Livrables

- `docs/admin-links-audit.md` (rapport complet des 319 routes)
- `src/config/adminNav.ts` refondu avec section Affiliates + menu resserré
- Aucune route supprimée, aucune migration DB

## Hors périmètre (à valider avant de faire)

- Suppression physique des routes mortes du `router.tsx` (risque de régression, second tour)
- Création des pages `/admin/affiliates/commissions` et `/admin/affiliates/proposals`
- Publication en production