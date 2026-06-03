# PIM — Passeport Intelligence Maison

Repositionner UNPRO comme l'infrastructure d'intelligence résidentielle : refonte du hero d'accueil + nouvelle landing dédiée `/pim`. Conserve l'identité visuelle premium dark/glassmorphism actuelle. Pas de refonte branding, pas de dashboard, pas de directory.

## Périmètre

- Refonte **hero homepage** (`/`) : nouveau headline PIM, sous-section problème + CTA "Créer mon PIM" / "Parler à Alex". On garde le reste de la homepage existante intact en-dessous.
- Nouvelle page **`/pim`** : landing dédiée, scroll cinématique, 7 sections.
- Préparation **schéma DB** (tables vides, RLS) pour futurs flux : `properties`, `property_documents`, `property_events`, `inspections`, `grants`, `warranties`, `maintenance_history`, `ai_property_insights`, `contractor_relationships`, `risk_signals`.

## Sections de la landing `/pim`

1. **Hero** — "Your home should remember everything." + graphe animé (maison 3D iso au centre, documents en orbite : factures · inspections · garanties · subventions · contractors · risques · entretien · diagnostics IA). Lignes d'énergie qui pulsent entre les nœuds.
2. **Problème fragmenté** — "Most homeowners make expensive decisions with fragmented information." 6 cartes glass : factures perdues · soumissions floues · entretien oublié · pas d'historique · entrepreneurs non imputables · zéro intelligence long terme.
3. **How PIM works** — 4 étapes numérotées : créer profil propriété → uploader documents/photos → IA analyse → recommandations / risques / subventions / intelligence entrepreneur.
4. **Not cloud storage** — bandeau contraste fort : "PIM is not a document vault. It is residential intelligence infrastructure." Réseau interconnecté SVG (mêmes nœuds que hero, vue différente).
5. **Alex** — surface concierge : analyser soumissions · comprendre risques · organiser documents · estimer projets · détecter signaux d'alerte · simplifier décisions.
6. **For organizations** — capacités institutionnelles futures : suivi subventions · résultats rénovations · vérification efficacité énergétique · performance entrepreneurs · analytics logement. Exemples génériques (utilities, municipalités, assureurs, financement) sans implier de partenariat.
7. **CTA final** — "Create My PIM" / "Talk to Alex" + reassure (gratuit, 30s, fr-CA).

## Hero homepage (`/`) — adaptation

Remplacer le bloc hero actuel (`HeroSectionAlexFirst` / `HeroCopilotMobile` selon le router actif) par un nouveau composant `HeroSectionPIMIntro` :

- Headline : *Your home should remember everything.* (FR : *Votre maison devrait tout se souvenir.*)
- Sub : PIM transforme votre propriété en profil intelligent lisible par l'IA. Rénovations, soumissions, inspections, subventions, garanties, risques — tout au même endroit.
- CTA primaire : **Créer mon PIM** → `/pim`
- CTA secondaire : **Parler à Alex** → déclenche orb
- Mini-graphe d'intelligence animé en arrière-plan (version compacte du hero `/pim`)

Le reste de la homepage existante (sections en-dessous) reste en place — pas de refonte globale.

## Direction visuelle

- Réutilise tokens existants (`#050816` base, glow blue TL + cyan BR, glass `rgba(255,255,255,0.04)` + blur 24px, radii 28/18/999, easing `cubic-bezier(.22,1,.36,1)` @420ms, hover `translateY(-2px)`).
- **Pas de Three.js / WebGL.** Le graphe animé = SVG + Framer Motion (cercles orbitaux, lignes de connexion qui pulsent en `stroke-dashoffset`, halo radial sur la maison centrale). Mobile-first, 60fps sur iPhone moyen.
- Scroll storytelling : `useScroll` + `useTransform` Framer Motion pour parallax léger et reveal séquentiel des sections.

## Détails techniques

- **Nouveaux fichiers**
  - `src/pages/PagePIMLanding.tsx` — route `/pim`, wrappée dans `MainLayout`, Helmet SEO complet
  - `src/components/pim/HeroSectionPIMIntro.tsx` — hero homepage adapté
  - `src/components/pim/PropertyIntelligenceGraph.tsx` — SVG animé réutilisé (props `variant: "hero" | "compact"`)
  - `src/components/pim/SectionFragmentedProblem.tsx`
  - `src/components/pim/SectionHowPIMWorks.tsx`
  - `src/components/pim/SectionNotCloudStorage.tsx`
  - `src/components/pim/SectionAlexCapabilities.tsx`
  - `src/components/pim/SectionForOrganizations.tsx`
  - `src/components/pim/SectionPIMFinalCTA.tsx`
- **Routing** : ajouter `/pim` dans `src/app/router.tsx` (page publique, lazy).
- **Homepage** : substituer le composant hero dans `src/pages/Home.tsx` (ou la home active selon `HomeIntentRouterDynamic`). À confirmer en explorant la route `/` au début du build.
- **i18n** : copy fr-CA principal, en fallback (utilise `useLanguage` existant).
- **SEO** : title `PIM — Passeport Intelligence Maison | UNPRO`, JSON-LD `Service` + `FAQPage`, canonical `https://unpro.ca/pim`.
- **Analytics** : `trackCopilotEvent("pim_landing_viewed")`, `pim_cta_create_clicked`, `pim_cta_alex_clicked`.

## Migration DB (préparatoire, vide)

Migration unique créant les 10 tables PIM avec :
- `id uuid pk`, `user_id uuid`, `property_id uuid` (sauf `properties`), `created_at/updated_at`, payload `jsonb data`
- GRANTs `authenticated` + `service_role` (pas `anon`)
- RLS activé, policies : owner-only via `auth.uid() = user_id`
- Index sur `property_id`, `user_id`

Aucune UI branchée dessus dans cette phase — uniquement le squelette pour permettre les phases suivantes.

## Hors scope (phase suivante)

- Flow réel de création de PIM (formulaire, upload, OCR)
- Dashboard PIM connecté
- Edge functions d'ingestion
- Logique d'analyse IA réelle
- Refonte des autres landings (contractor, condo)
- Navigation globale / footer

## Verification

1. Visiter `/pim` mobile (384px) — toutes sections lisibles, graphe anime à 60fps
2. Visiter `/` — nouveau hero PIM visible, sections suivantes intactes
3. Lighthouse mobile > 90 perf sur `/pim`
4. Vérifier que `MainLayout` (header, orb Alex, footer) reste fonctionnel
5. Confirmer migration appliquée et tables visibles dans Cloud
