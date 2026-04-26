## Problème identifié

Sur mobile, deux headers se superposent sur la home :

1. **Global SmartHeader** (restauré au dernier fix via `MainLayout`) — UNPRO logo + FR/EN + QR + hamburger ✅ correct
2. **Header local dupliqué** dans `src/components/home-copilot/HeroCopilotMobile.tsx` (lignes 51–57) — affiche un second logo UNPRO (le PNG `unpro-logo-master-transparent.png` qui apparaît dans un bloc clair) + un second bouton hamburger (icône `Menu` non fonctionnelle) ❌ à supprimer

C'est ce second bloc qui produit le « bloc blanc avec logo UNPRO » et le « second hamburger flottant » visibles dans la capture d'écran.

## Correction

### Fichier : `src/components/home-copilot/HeroCopilotMobile.tsx`

1. **Supprimer le `<header>` interne** (lignes 51–57) qui duplique logo + Menu.
2. **Nettoyer les imports devenus inutiles** :
   - Retirer `Menu` de l'import `lucide-react`
   - Retirer `import logoUnpro from "@/assets/unpro-logo-master-transparent.png";`
3. **Ajuster le padding-top** de la section centrale pour conserver un espacement propre directement sous le SmartHeader global (passer `pt-6` à `pt-8` sur le container hero pour compenser visuellement le retrait du header local).

### Aucune autre modification

- `MainLayout`, `SmartHeader`, `DrawerNavigationMobileIntent`, `MobileBottomNav` restent intacts.
- `PageHomeCopilot` reste wrappé dans `MainLayout`.
- L'orb Alex, le titre, l'input, les chips et le CTA restent identiques.

## Résultat attendu (test d'acceptance)

Structure mobile finale sur `/` :

```
[Global SmartHeader]   ← un seul
  UNPRO logo | FR/EN | QR | hamburger

[Page content]
  Alex orb
  Titre « Quel est votre projet aujourd'hui? »
  Input « Décrivez votre projet... »
  CTA « Parler à Alex »
  Chips raccourcis

[MobileBottomNav]
  Accueil | Pro | Alex orb | Soumissions | Compte
```

- ✅ Un seul logo UNPRO visible
- ✅ Un seul bouton hamburger
- ✅ Un seul drawer s'ouvre au tap
- ✅ Plus de bloc blanc avec logo dans le contenu
- ✅ Plus de second icône Menu flottant
