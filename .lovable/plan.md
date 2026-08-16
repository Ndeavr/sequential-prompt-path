# La fin des 3 soumissions — repositionnement complet de la page d'accueil

## Constat de l'existant (vérifié)

- `/` et `/index` → `HomeWithFeatureFlag` → `PageHomeSimple` → `MainLayout` + `HeroOrbMockup`. C'est la seule page home active; les variantes (`PageHomeCopilot`, `PageHomeVariantC`, `Home`, `PageHomeUnicorn`) restent sur disque, non routées sur `/`.
- `HeroOrbMockup` est aujourd'hui un hero « orbe Alex » sans promesse écrite : orbe + conversation inline + `FounderNoteConsent` (porte de consentement qui masque tout le contenu sous le fold tant qu'il n'est pas accepté) + 6 tuiles d'actions rapides + une bande générique « AI-POWERED / SÉCURISÉ / AUTOMATION / HUMAIN + IA ».
- `MainLayout` **désactive explicitement `SmartHeader` sur `/` et `/index`** (commentaire hérité de la home Unicorn). `PageHomeSimple` n'affiche aucun header de remplacement → la home n'a actuellement ni logo, ni navigation, ni bascule FR/EN, ni entrée « Entrepreneurs ».
- Routes existantes à réutiliser telles quelles : `/analyse-soumissions` + `/analyse-soumissions/importer` (comparaison), `/compare-quotes` (exemple), `/proprietaires/passeport-maison`, `/entrepreneur` (profil IA entrepreneur), checkout 1 $ via `buildCheckoutUrl()`, `/problemes`, `/projet`, `/verifier-pro`, `/condo`.
- Analytics : `trackCopilotEvent` déjà utilisé par la home (`homepage_loaded`). Aucun second système ne sera créé.
- OG : `src/seo/ogImage.ts` (source unique) pointe sur `/og/unpro-og-v4.jpg`; `public/og/` contient v3 et v4. Logos disponibles en `src/assets/brand/*.asset.json`.
- i18n : `LanguageProvider` + `LanguageToggle` existent et sont utilisés ailleurs (`useLanguage`), mais la home est 100 % FR en dur.

## Ce qui sera construit

### 1. Structure de la home (réutilisation, pas reconstruction)
`PageHomeSimple` devient la narration complète « La fin des 3 soumissions », section par section, dans l'ordre imposé :

```text
Hero (promesse + Alex orbe)
Problème  → Votre projet → Analyse IA → Bon PRO → Rendez-vous
Alex      → une question à la fois
Nouveau modèle → « Qui est le bon PRO pour mon projet? »
Pourquoi UNPRO peut recommander → Vérifié / Déclaré / Inféré / En attente
Comparaison de soumissions
Passeport Maison
Entrepreneurs
CTA final → UNPRO — La fin des 3 soumissions.
```

`HeroOrbMechanics` conservé : l'orbe Alex, `AlexHomepageConversation`, `AlexMorphingOrb` et l'ouverture voix restent inchangés. Le hero est réécrit autour d'eux :
- eyebrow `UNPRO + ALEX`, H1 `LA FIN DES 3 SOUMISSIONS.`, sous-titre `L'IA trouve le bon entrepreneur pour vos travaux.`, paragraphe, CTA principal **Trouver mon PRO** (ouvre Alex), CTA secondaire **J'ai déjà des soumissions** (`/analyse-soumissions/importer`), microcopy.
- Ordre mobile : titre + CTA principal visibles sans scroll (l'orbe passe sous le bloc texte, taille réduite en `< 430px`).

`FounderNoteConsent` ne masquera plus le contenu de la page : la porte de consentement reste affichée comme bloc, mais les sections narratives ne sont plus derrière `inert`. (La logique du composant n'est pas supprimée.)

### 2. Sections de contenu
Nouveaux composants dans `src/components/home-fin3/`, purement présentationnels, design system existant (fond sombre cinématique, verre, rayons 28/18px, easing maison) :
`SectionProblemeTroisSoumissions`, `SectionAlexUneQuestion`, `SectionNouveauModele`, `SectionPourquoiRecommander` (avec la légende de provenance Vérifié/Déclaré/Inféré/En attente — légende explicative uniquement, aucun statut inventé), `SectionComparerSoumissions`, `SectionPasseportMaison`, `SectionEntrepreneursEntree`, `SectionCtaFinal`.
Aucune nouvelle route, aucun nouveau workflow : tous les CTA pointent sur les routes listées ci-dessus.

### 3. Header
Réactiver `SmartHeader` sur `/` (retirer l'exclusion dans `MainLayout`, qui date de la home Unicorn) et ajuster son CTA principal en **Trouver mon PRO** + entrée visible **Entrepreneurs**, sans ajouter de nouveaux liens. Vérifier l'absence de doublon avec les overlays Alex et le menu mobile.

### 4. SEO / OG
- `PageHomeSimple` Helmet : title `UNPRO | La fin des 3 soumissions`, meta description fournie, `og:title` / `og:description` fournis, canonical `https://unpro.ca/` inchangé, JSON-LD `Service` mis à jour (description repositionnée, aucun rating/review).
- Nouvelle image OG `public/og/unpro-og-v5.jpg` 1200×630 : fond sombre UNPRO, **vrai logo existant du projet** (aucun logo régénéré), texte `LA FIN DES 3 SOUMISSIONS.` en très gros + sous-ligne. `src/seo/ogImage.ts` (source unique) pointera sur v5 avec un nouveau `?v=`. Contrôle de lisibilité à taille preview SMS.
- Les caches des crawlers ne se rafraîchissent pas immédiatement : le nouvel aperçu n'apparaîtra dans les partages qu'après re-scrape (forçable via un débogueur d'aperçu de lien).

### 5. FR / EN
Un fichier de copie unique `src/lib/copy/homeFin3.ts` (`fr` / `en`), consommé via le `useLanguage` existant. Version EN idiomatique : `The end of the 3-quote runaround.` / `AI helps find the right contractor for your project.` Aucune chaîne en dur dans les sections → plus de mélange FR/EN possible.

### 6. Analytics
Via `trackCopilotEvent` uniquement : `hero_find_pro_click`, `hero_compare_quotes_click`, `alex_started`, `project_started`, `quote_comparison_started`, `contractor_entry_click`, `contractor_1_dollar_activation_click`, `passport_click`. Les événements déjà émis ailleurs (`alex_started`) seront réutilisés, pas dupliqués.

### 7. Vérité produit (non négociable)
Aucun claim inventé : pas de note, avis, RBQ, assurance, disponibilité ou « entrepreneur vérifié » nominatif sur la home. La microcopy dit « Entrepreneurs vérifiés lorsque la vérification est confirmée ». Le 1 $ est présenté comme activation optionnelle, jamais comme condition d'indexation.

## Tests
Parcours réels en preview (Playwright + captures) : 360/390/430 px, tablette, desktop, FR et EN, déconnecté puis connecté :
1. Home → Trouver mon PRO → Alex démarre → qualification une question à la fois.
2. Home → J'ai déjà des soumissions → import/comparaison.
3. Home → Voir mon profil IA / Activer pour 1 $.
4. Home → Passeport Maison.
5. Contrôles : promesse visible sans scroll sur mobile, aucun lien mort, aucun placeholder, aucune fuite FR/EN, head/OG corrects, orbe Alex sans conflit avec le menu.
Puis typecheck + build de production.

## Critères de complétion
La home raconte une seule histoire (« La fin des 3 soumissions »), *Trouver mon PRO* est l'action dominante, Alex reste le point d'entrée conversationnel, comparaison + Passeport + entrée entrepreneur restent accessibles sans diluer la promesse, aucun workflow existant cassé, aucun claim non vérifié, OG avec le vrai logo, parcours critiques validés de bout en bout.
