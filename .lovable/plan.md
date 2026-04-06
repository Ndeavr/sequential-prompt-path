

# Plan — Navigation System Universal Intent-Based

## Résumé

Refonte complète du système de navigation pour l'aligner avec l'approche intent-based d'UNPRO. Bottom bars contextuelles par persona, drawer mobile structuré, header desktop intent-based, Alex central.

## Ce qui change

### 1. Bottom Bar Mobile — Contextuel par persona

**Fichier:** `src/config/navigationConfig.ts` — section `mobileTabsByRole`

Remplacer les tabs actuels (Inspirations, Vérifier, etc.) par des variantes utiles :

| Slot | Guest | Homeowner | Contractor | Condo Manager (partner) |
|------|-------|-----------|------------|------------------------|
| 1 | Accueil | Accueil | Accueil | Accueil |
| 2 | Explorer | Pro | Croissance | Condo |
| 3 | **Alex** (orb) | **Alex** (orb) | **Alex** (orb) | **Alex** (orb) |
| 4 | Tarifs | Soumissions | Profil | Conformité |
| 5 | Connexion | Compte | Compte | Compte |

- "Inspirations" et "Vérifier" **supprimés** du bottom bar (appartiennent à "Avis")
- Labels courts, icônes cohérentes, slot 2 et 4 dynamiques selon persona

**Fichier:** `src/components/navigation/MobileBottomNav.tsx` — Pas de changement structurel, juste consomme la nouvelle config.

### 2. Header Desktop — Intent-Based avec 4 zones

**Fichier:** `src/components/navigation/SmartHeader.tsx`

Réorganiser la nav desktop guest en 4 zones :

- **Zone 1 — Marque** : Logo UNPRO (existant, 16px)
- **Zone 2 — Navigation principale** : Accueil | Propriétaires | Entrepreneurs | Copros | Comment ça marche
- **Zone 3 — Actions contextuelles** (nouvelles, dynamiques par persona) :
  - Guest : rien de spécial
  - Homeowner : "Trouver un pro" | "Comparer soumissions"
  - Contractor : "Mon score AIPP" | "Importer profil"
  - Condo : "Passeport Condo" | "Conformité"
- **Zone 4 — État utilisateur** : Connexion/Compte (existant)

Nouveau composant `MenuQuickActionsContextual` pour la zone 3.

### 3. Header Mobile — Simplifié

**Fichier:** `src/components/navigation/SmartHeader.tsx`

Le header mobile reste minimal :
- Logo à gauche
- Language pill + Connexion/Avatar au centre-droit  
- Hamburger à droite
- Pas de duplication des liens principaux

### 4. Drawer Mobile — Structuré par sections

**Fichier:** Nouveau `src/components/navigation/DrawerNavigationMobileIntent.tsx` (remplace la `MobileMenuOverlay` inline)

Sections claires :
1. **Rôle actif** — Badge persona + bouton "Changer de rôle" (`MenuRoleSwitcherUniversal`)
2. **Navigation principale** — Accueil, Propriétaires, Entrepreneurs, Copros, Comment ça marche, Tarifs
3. **Actions par persona** — items contextuels (comme zone 3 desktop)
4. **Utilitaires** — Vérifier un entrepreneur, Support Alex, Connexion/Compte

### 5. Nouveaux composants

| Composant | Rôle |
|-----------|------|
| `MenuQuickActionsContextual` | Actions contextuelles par persona (desktop zone 3 + drawer section 3) |
| `MenuRoleSwitcherUniversal` | Switch de rôle inline (drawer + desktop dropdown) |
| `BadgePersonaActiveNavigation` | Pill affichant le rôle actif (Propriétaire/Entrepreneur/Gestionnaire) |
| `BottomBarMobileUniversal` | Wrapper qui sélectionne la bonne variante de bottom bar |

### 6. Config centralisée

**Fichier:** `src/config/navigationConfig.ts`

Ajouter :
- `quickActionsByRole` — actions contextuelles par persona
- `drawerSectionsByRole` — structure drawer par persona
- Mettre à jour `mobileTabsByRole` avec les nouvelles variantes

### 7. Tracking Supabase (migration)

Nouvelle table `navigation_click_events` :
```sql
CREATE TABLE navigation_click_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nav_key text NOT NULL,
  placement text, -- header, drawer, bottom_bar
  persona_key text,
  page_path text,
  clicked_at timestamptz DEFAULT now()
);
ALTER TABLE navigation_click_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own clicks" ON navigation_click_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anon can insert clicks" ON navigation_click_events FOR INSERT TO anon WITH CHECK (user_id IS NULL);
```

### 8. Fichiers modifiés

| Fichier | Action |
|---------|--------|
| `src/config/navigationConfig.ts` | Update mobileTabsByRole + add quickActionsByRole |
| `src/components/navigation/SmartHeader.tsx` | Refactor desktop nav zones, extract drawer |
| `src/components/navigation/MobileBottomNav.tsx` | Minor — consume new config |
| `src/components/navigation/DrawerNavigationMobileIntent.tsx` | **New** — structured drawer |
| `src/components/navigation/MenuQuickActionsContextual.tsx` | **New** — contextual actions |
| `src/components/navigation/MenuRoleSwitcherUniversal.tsx` | **New** — role switcher |
| `src/components/navigation/BadgePersonaActiveNavigation.tsx` | **New** — active role badge |
| `src/components/navigation/BottomBarMobileUniversal.tsx` | **New** — wrapper selecting variant |
| Migration SQL | New table `navigation_click_events` |

### 9. Ce qui ne change PAS

- Logo style/size (16px brushed metal)
- AlexBottomSheetLauncherUNPRO (orb central)
- Routes existantes
- Auth flow (/role page)
- Safe area handling
- Dark mode only

