
# UNPRO — Lisibilité Absolue (Règle Système)

Objectif : la lisibilité devient une contrainte système. Aucun texte sous WCAG AA, aucune opacité < 70% sur du texte, aucun gris faible sur fond sombre.

## 1. Correctif immédiat (capture jointe)

La carte « Aperçu de votre analyse » + sections « Être trouvé / Pourquoi cela compte » utilisent `text-muted-foreground` (~45%) sur surface glass sombre → quasi invisible.

- Localiser la page concernée (AIPP / outreach landing — probablement `PageAuditAIPPv2.tsx`, `PageInstantAuditFunnel.tsx` ou `src/pages/outbound/*`) et corriger les classes fautives en une passe.
- Remplacer `text-gray-400/500`, `text-muted-foreground/60`, `opacity-50/60` sur du texte par les nouveaux tokens `text-body` / `text-body-strong`.
- Augmenter opacité des surfaces glass de la page : `bg-white/5` → `bg-slate-900/85` + `backdrop-blur-xl`.

## 2. Design tokens globaux (source unique)

Ajouter dans `src/index.css` (HSL, dark theme UNPRO `#050816`) :

```text
--text-primary       : 0 0% 98%   (titres, body important)
--text-body          : 0 0% 92%   (paragraphes)
--text-secondary     : 0 0% 80%   (labels, sous-titres)
--text-muted         : 0 0% 70%   (meta, captions — plancher absolu)
--text-disabled      : 0 0% 55%   (uniquement état disabled, jamais contenu)

--surface-primary    : 222 47% 5%
--surface-secondary  : 222 40% 8%
--surface-glass      : 222 30% 12% / 0.85   (jamais < 0.80)

--border-primary     : 0 0% 100% / 0.10
--border-secondary   : 0 0% 100% / 0.06
```

Étendre `tailwind.config.ts` :
- `textColor`: `primary`, `body`, `secondary`, `muted`, `disabled`
- `backgroundColor`: `surface`, `surface-2`, `surface-glass`
- `borderColor`: `line`, `line-soft`

Lint (ESLint plugin custom léger ou règle `no-restricted-syntax`) bloquant :
- `text-gray-*`, `text-slate-300/400/500` en classe directe
- `opacity-[10-69]` appliquée à un nœud texte
- `text-xs` sur `<p>` / contenu non-meta

## 3. Helper composant `<Text>`

`src/components/ui/text.tsx` — variantes `display | h1 | h2 | body | bodyStrong | label | meta` → mappent vers les tokens. Encouragé pour tout nouveau code ; ESLint signale `<p className="text-...">` non token.

## 4. Glassmorphism safe

Token unique `.glass-card` dans `index.css` :

```css
.glass-card {
  background: hsl(var(--surface-glass));
  backdrop-filter: blur(20px) saturate(140%);
  border: 1px solid hsl(var(--border-primary));
}
```

Remplacement progressif des `bg-white/5 backdrop-blur-*` ad-hoc.

## 5. UI Health Monitor (admin)

Backend (Lovable Cloud) :
- Table `ui_accessibility_audit` (route, component, issue_type, severity `info|warn|critical`, contrast_ratio, fg, bg, viewport, detected_at, resolved_at, screenshot_url)
- Edge function `ui-health-scan` : Puppeteer (via Browserless) → liste des routes (depuis `routesConfig.ts`) → screenshots desktop 1280 + mobile 390 → parse DOM, calcule contraste WCAG (axe-core) sur chaque nœud texte visible → insère findings.
- Cron `pg_cron` quotidien 04:00 ET.

Frontend :
- Page `/admin/ui-health` (`AdminUIHealthMonitor.tsx`)
- KPI globaux 🟢🟡🔴, tableau findings filtrable, drawer détail avec screenshot + sélecteur + ratio + suggestion (token recommandé).
- Lien dans sidebar admin (cluster Operations).

Reliability : suit le standard (`reportOutcome`, FailureCode `UI_SCAN_FAILED`).

## 6. Mobile-first guard

Token CSS `html { -webkit-text-size-adjust: 100% }`, base body 16px / line-height 1.55. Composant `<Text variant="meta">` = 13px **uniquement** pour timestamps/badges.

## 7. Rollout

1. Tokens + tailwind config + classe `.glass-card`
2. Correctif page capture (immédiat, manuel)
3. ESLint règle (warn d'abord, error après nettoyage initial)
4. Migration + edge function + page admin UI Health
5. Première passe de scan + correctifs batch sur les 10 pires routes

## Hors scope

- Refactor complet de tous les composants existants (fait progressivement, piloté par le rapport Health Monitor).
- Mode clair (l'app reste dark-only).

Confirmez et je passe en build.
