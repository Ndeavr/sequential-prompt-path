# Refonte Admin — 5 sections, 1 objectif: payer des entrepreneurs

## Objectif
En ouvrant l'admin, répondre en <5s à: *"Combien d'entrepreneurs trouvés aujourd'hui, en onboarding, payants ?"*

Aucune route ni page n'est supprimée — uniquement la navigation visible est restructurée. Tout le reste reste accessible via `/admin/labo` (caché).

## Nouvelle structure (5 sections max)

### 1. 🏠 Dashboard (`/admin`)
3 KPI hero en haut, lisibles en 2s :
- **Trouvés aujourd'hui** (nouveaux prospects découverts)
- **En onboarding** (essai 1$ + paiement en attente)
- **Payants** (actifs ce mois + MRR)

Widgets secondaires : Alertes (ex-page Alertes intégrée comme widget), Activations du jour, RDV générés, mini-graphe revenus 7j.

### 2. 👷 Entrepreneurs (`/admin/entrepreneurs`)
Fusion de : Utilisateurs, Entrepreneurs, Vérifications, Validation, Entrepreneurs vérifiés.

Sous-onglets (pipeline horizontal):
- **Prospects** → Découverts · À contacter
- **Qualification** → AIPP · RBQ · Assurances
- **Activation** → Essai 1$ · Paiement en attente · Actifs
- **Membres** → Recrue · Pro · Premium · Élite · Signature
- **Suspendus**

Réutilise les pages existantes en filtrant par statut, pas de nouvelle data layer.

### 3. ✨ Alex (`/admin/alex`)
Regroupe : conversations, scripts, knowledge base, prompts, onboarding voice. Tab unique avec sous-onglets.

### 4. 📈 Acquisition (`/admin/acquisition`)
Fusion de : Outbound City-First, Autopilot, Core, Growth.
Sous-onglets : Campagnes · Agents IA · Emails · SMS · Appels · Performance.

### 5. 💰 Revenus (`/admin/revenus`)
MRR · Paiements · Stripe · Factures.

### 🧪 Laboratoire (`/admin/labo`) — caché
Lien discret pied de sidebar. Contient Intelligence (Problem Graph, Answer Engine, Predictive, Optimization), Territoires, Capacity, SEO, Screenshot Intel, etc. Rien ne disparaît techniquement.

## Barre du bas (mobile)
Remplacer `KPI | Alertes | Alex | Admin | Compte` par :

```text
🏠 Dashboard   👷 Entrepreneurs   ✨ Alex   📈 Acquisition   👤 Compte
```

KPI et Alertes deviennent des widgets dans Dashboard (plus d'items de barre).

## Détails techniques

**Fichiers touchés (UI navigation uniquement) :**
- `src/layouts/AdminLayout.tsx` — remplacer `NAV_GROUPS` par 5 entrées + entrée Labo. Les anciens `key` (people, growth, outbound-*, intelligence) sont déplacés sous Labo.
- `src/components/navigation/MobileBottomNav.tsx` (et `BottomBarMobileUniversal.tsx`) — nouvelle config 5 items lorsque rôle admin.
- Nouvelles pages-conteneurs (shells avec Tabs shadcn qui montent les pages existantes via routes enfants ou composants) :
  - `src/pages/admin/PageAdminEntrepreneursHub.tsx` (Prospects/Qualif/Activation/Membres/Suspendus)
  - `src/pages/admin/PageAdminAlexHub.tsx`
  - `src/pages/admin/PageAdminAcquisitionHub.tsx`
  - `src/pages/admin/PageAdminRevenusHub.tsx`
  - `src/pages/admin/PageAdminLabo.tsx` (grille de cartes vers anciennes routes)
- `src/app/App.tsx` (ou routes admin) — ajouter les 5 routes hub + `/admin/labo`. **Conserver toutes les routes actuelles** pour ne rien casser.
- `src/pages/admin/AdminDashboard.tsx` — remanier l'en-tête avec les 3 KPI hero + widgets Alertes/Activations.

**Aucune migration DB.** Aucun changement de logique métier, de RLS, d'edge function ou de scoring. Uniquement navigation, layout et composition de pages.

**Données KPI hero** : utiliser les vues / requêtes déjà présentes dans `AdminDashboard` et `useCommandCenterData`. Si un compteur manque (ex: "trouvés aujourd'hui"), simple `select count` sur la table prospects existante.

## Hors scope
- Pas de suppression de fichiers/routes.
- Pas de changement Alex, voix, Stripe, scoring, pricing.
- Pas de refonte visuelle au-delà du regroupement (réutilise tokens `.admin-theme`, `glass-strong`).

## Questions ouvertes
1. Confirmer le libellé "Acquisition" plutôt que "Outbound" dans la barre du bas ?
2. Le hub Entrepreneurs doit-il être une page unique avec Tabs internes, ou route parente `/admin/entrepreneurs/*` avec sous-routes (meilleur deep-link) ? — je recommande sous-routes.
3. Garder l'icône Alex centrée et proéminente dans la barre du bas (comme aujourd'hui) ou la traiter comme item standard ?
