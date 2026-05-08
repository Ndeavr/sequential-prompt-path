
# Fix : pages bloquées sur "Chargement" + site lent

## Diagnostic

Deux causes distinctes se combinent et donnent l'impression que tout est figé.

### 1. Bundle initial monstrueux → "tout est lent"
Mesures réelles côté navigateur sur le preview (mobile-class) :
- DOMContentLoaded : **12,1 s**
- First Contentful Paint : **12,2 s**
- 186 ressources chargées au boot (1,9 Mo de scripts), dont `@elevenlabs/react`, `framer-motion`, `lucide-react`, `qrcode`, etc., tous tirés *avant* que la 1ʳᵉ page apparaisse.
- `react-router-dom` met ~2 s à charger sur le preview.

Sur 5G+ mobile (cas du screenshot), c'est exactement ce que l'utilisateur voit : un écran "Chargement…" pendant 10–15 s sur **toutes** les pages.

### 2. Écrans "Chargement" qui ne s'affichent jamais sur "prêt"
- `src/pages/blog/BlogArticlePage.tsx` ligne 79–85 : si `useQuery` reste en `isLoading`, on affiche "Chargement..." sans **aucun** timeout, sans gestion d'erreur, sans CTA. Le réseau prod renvoie pourtant l'article en 1,1 s — mais sur mobile lent ou si JS n'a pas fini de charger, l'utilisateur ne voit que cet écran.
- `src/components/ProtectedRoute.tsx` (admin) : timeout de 6 s OK, mais pendant ces 6 s on n'affiche que "Validation de l'accès administrateur…" sans CTA secours. Si la requête `user_roles` est lente, l'utilisateur croit que c'est figé.
- `src/guards/UniversalRouteGuard.tsx` : même pattern.
- L'autostart Alex (`Charlotte` ElevenLabs) charge un SDK de 199 Ko en chemin critique alors qu'il pourrait être 100 % différé.

L'écran "Chargement…" du screenshot vient du loader d'auth global (classe `text-muted-foreground text-sm`), confirmé par le session replay.

### 3. Pourquoi sur le custom domain `unpro.ca` aussi
Le bundle publié a la même structure ; chaque navigation lance un boot complet (auth bootstrap + role query + ensureProfile). Aucune gate n'a de fallback "si ça traîne, montre la page quand même".

---

## Plan d'action

### A. Casser les loaders bloquants (fix immédiat des 2 pages)

1. **`src/pages/blog/BlogArticlePage.tsx`**
   - Ajouter un `useLoadingTimeout(isLoading, 4000)` : au-delà de 4 s, afficher la page avec un skeleton de contenu + message discret + bouton "Recharger" et "Retour au blog".
   - Gérer le cas `error` du `useQuery` (actuellement ignoré) avec un écran utile (pas un blanc).
   - Activer `placeholderData` pour ne pas démonter la layout pendant le re-fetch.
   - Réduire `retry` à 0 pour cette query (sinon doublement du temps en cas de lenteur).

2. **`src/components/ProtectedRoute.tsx` + `src/guards/UniversalRouteGuard.tsx`**
   - Le timeout admin passe de 6 s → 3,5 s.
   - Pendant `checking`, afficher l'écran avec **deux** CTAs visibles tout de suite : "Réessayer" et "Accueil" (au lieu d'un texte seul).
   - Si `isAuthenticated && roles.includes("admin")` est connu localement, **ne jamais** afficher de loader, rendre directement `children`.

3. **`src/stores/authSessionStore.ts`**
   - Le hard timeout actuel est 3 s — OK. Ajouter un log explicite quand il déclenche pour qu'on le voie en prod.

### B. Diviser par 3–5 le temps de FCP (fix de fond "site très lent")

4. **Différer les SDK voix hors du chemin critique**
   - `OverlayAlexVoiceFullScreen`, `AlexChatFallbackPanel`, `AlexVoiceDebugPanel` sont déjà `lazy()` dans `providers.tsx` — bon. Mais `@elevenlabs/react` est tiré tôt par d'autres chemins (`useAlexConversation`, `useAlexVoiceInput`, etc.).
   - Convertir tous les imports d'`@elevenlabs/react` en imports dynamiques uniquement déclenchés par `openAlex()`.

5. **Tree-shake `lucide-react`**
   - Vérifier que les imports sont nominatifs (`import { Wifi } from "lucide-react"`) — ils le sont déjà mais le bundle dev de Vite pré-bundle 156 Ko. Ajouter une exception dans `vite.config.ts` `optimizeDeps.exclude` n'a pas d'impact en prod ; en revanche s'assurer qu'aucun fichier ne fait `import * as Icons from "lucide-react"`.

6. **Lazy-load les routes lourdes par cluster**
   - Confirmer dans `src/app/router.tsx` que les routes `admin/*`, `outbound/*`, `aipp/*` utilisent toutes `lazy()` (déjà visible pour la majorité). Repérer celles qui ne le sont pas et les passer en lazy.

7. **Précharge intelligente uniquement quand nécessaire**
   - Le tag `<link rel="preload" href="/images/hero-bg.webp">` dans `index.html` charge 106 Ko sur **toutes** les routes. Console l'a flaggé : "preloaded but not used". Le déplacer en `loading="lazy"` sur la home seulement.

8. **Désactiver l'autostart Alex sur les pages article/admin**
   - L'orchestrateur d'autostart provoque un mount inutile sur `/blog/*` et `/admin`. Le scoper aux surfaces produit (home, /alex, landings pro).

### C. Filets de sécurité globaux

9. **Composant `<GlobalLoadTimeoutBanner />`**
   - Monté dans `Providers`. Si `document.readyState !== "complete"` après 8 s, affiche un bandeau discret en bas : "Connexion lente détectée — recharger". Évite le sentiment de page morte.

10. **Logs perf en prod**
    - Ajouter un envoi unique de `performance.timing` à `system_events` quand FCP > 5 s pour qu'on puisse mesurer le vrai gain.

---

## Détails techniques

```text
Fichiers édités :
  src/pages/blog/BlogArticlePage.tsx        (timeout + erreur + CTA)
  src/components/ProtectedRoute.tsx         (timeout 3.5s + CTA pendant checking)
  src/guards/UniversalRouteGuard.tsx        (idem)
  src/app/providers.tsx                     (monter GlobalLoadTimeoutBanner)
  src/hooks/useAlexConversation.ts          (import dynamique d'elevenlabs)
  src/hooks/useAlexVoiceInput.ts            (idem)
  src/hooks/useAlexHomeAutostart.ts         (scoper aux surfaces produit)
  index.html                                 (retirer le preload hero-bg.webp global)
  src/app/router.tsx                         (lazy() manquants)

Fichiers créés :
  src/components/system/GlobalLoadTimeoutBanner.tsx
```

Aucune migration DB n'est nécessaire (les routes répondent déjà 200, les gardes côté serveur sont OK).

---

## Critères de succès

- `/admin` : si je suis admin, la page apparaît en < 1,5 s sur mobile (pas d'écran "Validation…" visible).
- `/blog/pourquoi-subventions-renovation-construction` : contenu visible en < 3 s sur mobile, jamais bloqué sur "Chargement…" sans CTA.
- FCP médian sur preview : passe de ~12 s à < 4 s.
- Aucun écran "Chargement" sans porte de sortie après 4 s.
