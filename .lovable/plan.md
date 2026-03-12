

# Homepage Visual Overhaul — Match Reference Design

## What Changes

The homepage needs to shift from dark-mode-first to the **luminous premium light aesthetic** shown in the reference image. This affects colors, backgrounds, buttons, logo, and social proof visuals.

## Changes Required

### 1. Force Light Mode on Homepage
The homepage (and public landing pages) should render in light mode regardless of the global theme setting, matching the reference's bright white/blue gradient feel.
- Wrap the Home page content in a `className="light"` container, or toggle theme on mount for the homepage route.

### 2. Logo Update
Replace the current sparkle icon + gradient text logo with a **house icon + "UNPRO" text** matching the reference:
- Blue house icon in a rounded container
- Bold "UNPRO" text next to it
- Apply in `MainLayout.tsx` header

### 3. Navbar Buttons
Update the navbar to match the reference:
- "Créer un Projet" as a **blue pill button** (primary, rounded-full)
- "Connexion" as a **white bordered pill button** (outline, rounded-full)
- Nav links: "Trouver un Pro", "Services", "FAQ"

### 4. Hero Section Background
Replace the current subtle gradient with a **luminous soft blue/white flowing gradient** with organic wave/blob shapes:
- Light blue radial gradients
- Soft flowing wave SVG overlays with blue tint
- White-to-blue organic transitions (like the reference's fluid shape)

### 5. CTA Button Style
The main "Décrivez votre projet" CTA should be:
- Full-width rounded-full (pill shape)
- Blue gradient background (`from-primary to-accent`)
- White arrow icon in a circle on the right
- Large, prominent

### 6. Social Proof Banner
The "Approuvé par des milliers de clients" section should use:
- Individual real-looking avatar images (crop from the existing `avatars-group.jpg` or use distinct positions)
- A "+2k" counter badge
- Blue gradient background matching the reference

### 7. Trust Badges
Below the CTA:
- Checkmark icons with labels: "Gratuit & Rapide", "Sécurisé", "Sans engagement"
- Clean inline layout with subtle icons

### 8. Color Refinements
- Primary buttons: solid blue with glow shadow
- Cards: white with subtle border, light shadow
- Background: warm white `#F8FAFC` with blue gradient blobs
- Text: dark navy for headings, gray for body

## Files to Edit

| File | Change |
|------|--------|
| `src/layouts/MainLayout.tsx` | Logo (house icon), nav links, button styles (pill shapes) |
| `src/pages/Home.tsx` | Force light theme, hero background gradients, CTA pill style, social proof avatars, trust badges |
| `src/index.css` | Minor light-mode refinements if needed |
| `src/components/ui/button.tsx` | Add `pill` size variant (rounded-full) |

## Scope
Pure visual/CSS changes. No backend, no new data. Approximately 4 files modified.

