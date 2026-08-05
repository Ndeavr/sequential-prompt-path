# Lisibilité globale UNPRO — correction de la cause racine + protection permanente

## Cause racine (vérifiée en rendu réel)

J'ai rendu `/contact` dans un vrai navigateur et mesuré les styles calculés :

- Le titre « Nous contacter » est en `rgb(12, 18, 34)` (bleu nuit quasi noir).
- Le fond peint réellement à l'écran est `#050816` (noir bleuté) — donc texte noir sur fond noir.

Pourquoi : le thème par défaut du projet (`:root` dans `src/index.css`) est un thème **clair** (`--background: 220 100% 98%`, `--foreground: 222 49% 9%`), alors que l'application peint un fond **sombre** sur tout l'écran via `StableBackgroundLayer` monté au-dessus du routeur (`src/app/App.tsx`). Le dégradé clair de `body` est entièrement recouvert par cette couche.

Résultat : seules les pages qui s'enveloppent explicitement dans `.alex-immersive` ou `.admin-theme` (les deux seuls scopes qui basculent les tokens en sombre) sont lisibles. Toute page qui utilise simplement `text-foreground` — le comportement normal et attendu — est illisible.

Deuxième défaut trouvé : la classe `.landing-warm`, utilisée par 5 pages (dont `/contact`), **n'est définie nulle part** dans le CSS. Elle ne produit ni fond clair ni tokens ; c'est une classe morte qui laisse les pages sur les tokens clairs devant le fond sombre.

## Correction de la cause racine

1. **Un seul thème par défaut, cohérent avec le fond réellement peint.** Basculer `:root` sur la palette cinématique sombre UNPRO (celle aujourd'hui dupliquée dans `.admin-theme` / `.alex-immersive`) : `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring` + tokens de lisibilité `--text-*` / `--surface-*`. Par défaut, toute page devient lisible sans wrapper.
2. **`.admin-theme` / `.alex-immersive` deviennent des alias** du thème par défaut (conservés pour ne rien casser), sans redéfinition divergente.
3. **`.landing-warm` devient un vrai scope clair défini** : fond chaud `#F7F6F0` opaque (donc il masque la couche sombre) + jeu complet de tokens clairs. Les 5 pages qui l'utilisent gardent leur identité claire voulue, avec un contraste correct.
4. **La couche décorative sombre reste inchangée** (identité visuelle premium préservée) ; c'est le système de tokens qui s'aligne dessus, pas l'inverse.
5. Aucun `darkMode: class` en conflit : pas de bascule de thème accidentelle, un seul état par scope.

## Balayage de l'application

Le projet possède déjà un crawler axe-core : `scripts/audit/route-audit.mjs` + `scripts/audit/extract-routes.mjs` (extraction automatique des routes depuis le routeur, contraste WCAG sur styles calculés, overlays bloquants, débordement horizontal). Je le réutilise — pas de seconde architecture.

- Exécution `--scope=all` en 390px et 1440px sur l'ensemble des routes énumérées automatiquement (public, propriétaire, entrepreneur, onboarding, login/OTP, activation 1 $, profils, Alex, admin/CRM/acquisition, erreurs).
- Correction des échecs restants **dans les composants et tokens partagés** (cards, formulaires, inputs, placeholders, états disabled, dialogs, drawers, dropdowns, toasts, états loading/empty/error), pas par exceptions page par page.
- Suppression des couleurs codées en dur (`text-black`, `text-gray-*`, `bg-white`, opacités < 70 % sur du texte) uniquement là où elles cassent la lisibilité.
- Priorité au parcours revenu : outreach → `/pro/:slug` → `/unpro/activate/:token` → checkout 1 $ → profil activé.

## Protection permanente

- Nouveau script `npm run test:ui-contrast` : lance le crawler axe-core sur les routes critiques + un échantillon représentatif, aux deux tailles d'écran, et **sort en code d'erreur non nul** dès qu'une violation `color-contrast` sérieuse est détectée (aujourd'hui le crawler écrit un rapport sans échouer).
- Captures d'écran de référence pour les routes revenu, écrites dans `docs/audit/`, afin de détecter les régressions visuelles majeures.
- Liste de routes pilotée par l'extraction automatique : toute nouvelle page hérite de la couverture sans configuration.
- Ajout du script à la vérification existante (`npm run test` reste intact ; le gate contraste s'exécute à part et bloque en cas d'échec critique).

## Détails techniques

- Fichiers principaux touchés : `src/index.css` (tokens `:root`, scope `.landing-warm`, alias `.admin-theme` / `.alex-immersive`), plus les composants partagés révélés par l'audit.
- `tailwind.config.ts` : inchangé sauf si l'audit prouve un token manquant.
- Outillage : `scripts/audit/route-audit.mjs` étendu d'un mode `--fail-on=contrast`, `package.json` +1 script.
- Aucune table, migration, Edge Function, policy RLS ni changement Stripe/Twilio/Resend. Réparation UI uniquement.

## Vérification finale

Build de production, `npm run test`, `npm run test:ui-contrast`, rendu réel de `/contact` en 390px et 1440px avec mesure du contraste calculé, vérification des routes revenu, contrôle que les overlays Alex n'assombrissent pas les pages, et test navigation/scroll/formulaires. Le rapport final listera : routes testées, échecs trouvés, échecs corrigés, et toute route non testable avec sa raison précise.
