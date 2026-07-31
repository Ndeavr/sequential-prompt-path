## Ce que j'ai vérifié avant d'écrire ce plan

- `src/app/router.tsx` déclare **890 routes** (1 934 lignes). Un audit manuel page par page est impossible : il faut un crawler.
- Un système de monitoring accessibilité **existe déjà** : `axe-core@4.12` est installé, la table `ui_accessibility_audit` et la page `/admin/ui-health` (`AdminUIHealthMonitor.tsx`) sont en place. Je l'étends, je n'en crée pas un deuxième.
- Un cockpit funnel existe déjà : `PageAdminCriticalPathAudit.tsx` (7 étapes prospect → payment_ok → reward_visible), plus `PageAdminRevenuePathAudit`, `PageAdminGoLivePaymentHealth`, `PageAdminUnproStripeHealth`. Le rapport « Santé conversion 1 $ » sera une vue consolidée de ces sources, pas un nouveau système.
- Les scopes de thème sombre `.alex-immersive` / `.admin-theme` sont définis dans `index.css` (l.122, 298, 1114). La règle mémoire existante est déjà : toute page à fond sombre **doit** wrapper sa racine dans un de ces scopes, sinon les tokens du thème clair rendent le texte invisible. Les captures fournies correspondent exactement à ce symptôme (cartes claires + texte hérité, sections qui changent de thème).
- Je n'ai **pas** encore confirmé, page par page, quelles routes violent cette règle : c'est précisément ce que le crawler produira. Je n'affirme aucune cause par page avant sa mesure.

## Stratégie

Un seul run ne peut pas valider 890 routes de bout en bout. Le plan est découpé pour livrer immédiatement la valeur revenu (parcours 1 $) et industrialiser le reste.

```text
Phase 1  Moteur d'audit (crawler + registre)      → mesure, aucune correction
Phase 2  Correction des causes racines            → tokens/scopes/overlays
Phase 3  Parcours 1 $ E2E prouvé                  → SMS → activation → Stripe → dashboard
Phase 4  Rapport admin consolidé + re-crawl        → preuve
```

### Phase 1 — Moteur d'audit de routes

- Script Playwright `scripts/audit/route-audit.ts` : extraction des routes depuis `router.tsx` + `routeRegistry.ts`, résolution des paramètres dynamiques avec de vraies valeurs de production (slug entrepreneur, token d'activation, ville/catégorie).
- Pour chaque route, capture : rendu HTTP/SPA, violations axe-core (contraste, focus, noms accessibles), scroll réel jusqu'au dernier élément, overlays interceptant les clics (`elementFromPoint` au centre du CTA), erreurs console, requêtes 4xx/5xx, CTA principal détecté + destination, présence d'un skeleton jamais remplacé.
- Trois breakpoints au premier passage : 390×844, 1366×768, 1920×1080 ; 360×800 et 412×915 sur les routes du funnel uniquement.
- Résultats persistés dans la table existante `ui_accessibility_audit` (colonnes complémentaires si nécessaire), pas dans une nouvelle table.
- Sortie complémentaire : registre `docs/audit/route-registry.md` (URL, source du lien, rôle requis, thème, statut, contraste, scroll, CTA, destination, erreurs, blocage conversion, statut corrigé) et mise à jour de `docs/broken-links-audit.md`.

### Phase 2 — Correction des causes, pas des symptômes

Priorisée par le classement du crawler, jamais par correctif global :

- **Scope de thème manquant** : ajout de `.alex-immersive` / `.admin-theme` / `.landing-warm` sur les racines fautives. C'est l'hypothèse principale pour les captures, à confirmer par la mesure.
- **Surfaces sans couleur de texte explicite** : chaque `Card`/`Dialog`/`Drawer`/`Sheet`/`Table`/`Select` qui hérite d'un texte incompatible reçoit sa paire surface + foreground via tokens sémantiques ; aucune couleur brute (`text-white`, `text-gray-*`, hex) ne subsiste dans les fichiers touchés.
- **Tokens** : consolidation de la source unique (background, surface, elevated, text primary/secondary/muted, border, input, primary, destructive, success, warning, focus ring) dans `index.css`, sans redéfinir les thèmes déjà corrects.
- **Blocages d'affichage** : `overflow:hidden` sur html/body/layouts, `100vh`/`max-height` coupants, z-index et overlays fantômes, header fixe couvrant le CTA, safe-area mobile, restauration du scroll après fermeture de modal, gardes d'auth en boucle, boutons désactivés sans explication.
- Si le thème clair/sombre n'est pas réellement supporté sur une page de conversion, la variante incomplète est désactivée proprement au profit du thème UNPRO officiel ; aucune page de conversion ne dépend de `prefers-color-scheme`.

### Phase 3 — Parcours du premier 1 $, prouvé de bout en bout

Chaîne testée en conditions réelles avec Stripe en mode test :

lien SMS/courriel → `/unpro/activate/:token` → rapport AIPP → CTA unique → auth/OTP → offre « Activation 7 jours — 1 $ » → session Stripe → paiement test → webhook → statut d'abonnement → activation → dashboard → confirmation → audit log.

- Conservation de `utm_*`, `campaign_id`, `prospect_id`, `referral_id` à chaque saut, y compris à travers l'authentification ; retour à la destination initiale, jamais à l'accueil.
- Le CTA du rapport AIPP est vérifié comme menant réellement à l'offre 1 $ (les captures montrent le bloc « PLAN RECOMMANDÉ » coupé en bas — à confirmer comme scroll bloqué ou CTA hors écran).
- États distincts et honnêtes : pending / payé / échoué / annulé / lien expiré / webhook en attente, chacun avec la prochaine action utile et une reprise sans recommencer le parcours. Aucun succès affiché sans confirmation serveur.
- **Vérité des chiffres** : les pourcentages « Gains rapides » (+22 % d'appels, +18 % de confiance…) visibles dans les captures sont audités. S'ils ne proviennent pas d'une méthodologie documentée en base, ils sont remplacés par des bénéfices qualitatifs ou explicitement étiquetés comme estimations.
- Aucun SMS ni campagne réelle déclenché : uniquement des tokens et comptes de test.

### Phase 4 — Rapport admin « Santé conversion 1 $ »

Onglet ajouté à `/admin/ui-health`, alimenté par les sources existantes (`ui_accessibility_audit`, `PageAdminCriticalPathAudit`, health Stripe/webhook) : pages testées, pages illisibles, liens cassés, erreurs console, erreurs Edge Functions, dernière session Stripe, dernier webhook réussi, dernier paiement, activations en attente, blocage actuel, prochaine action prioritaire.

## Détails techniques

- Réutilisation stricte : tables, webhooks, politiques RLS et fonctions existants. Migration uniquement si le crawler a besoin de colonnes supplémentaires sur `ui_accessibility_audit`.
- Tests ajoutés : crawl de routes, liens cassés, contraste, scroll, clavier, mobile, console, 4xx/5xx, E2E 1 $, retours Stripe, lien expiré, post-auth, compte déjà activé.
- Le run pinné « First Dollar » (Electro Pompe) n'est pas modifié.
- Hors périmètre : SEO, sitemaps, corpus IA, nouvelles campagnes sortantes.

## Livraison et preuve

Rapport final : routes testées et leur statut, causes racines identifiées, fichiers corrigés, migrations éventuelles, captures avant/après aux breakpoints mobile et desktop, et trace E2E du paiement 1 $. Rien n'est déclaré « corrigé » sans cette preuve ; si un service externe bloque (Stripe, Twilio, webhook), j'indique le service, la requête, le code d'erreur exact et l'action humaine requise.
