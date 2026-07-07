## Fix — Activation CTA renvoie "temporairement indisponible"

### Diagnostic
Test live de `create-activation-checkout` avec `{slug:"sprint-isolation-qc", source:"isolation-qc"}` → **HTTP 404 `prospect_not_found`**.

Le code source de la fonction contient déjà la branche `isSprint` (source `isolation-qc` OU slug commençant par `sprint-`) qui saute la recherche prospect. **La version déployée est stale** — elle ne contient pas cette branche, donc elle cherche un prospect qui n'existe pas et renvoie 404 → front affiche l'erreur rouge.

### Correctif
1. **Redéployer `supabase/functions/create-activation-checkout/index.ts`** (touch/no-op edit force le redeploy) pour que la logique `isSprint` soit active en prod.
2. **Durcir la fonction** pour éviter la même classe de bug :
   - Si `isSprint` OU si prospect introuvable, continuer quand même vers Stripe (jamais bloquer un paiement à cause d'un lookup interne). Logger l'événement sans prospect_id.
   - Renvoyer un message d'erreur plus précis (`prospect_lookup_failed`, `stripe_error`, etc.) pour futur debug.
3. **Améliorer le fallback front** `PageProIsolationQC.tsx` :
   - Logger `cta_failed` dans `first_dollar_sprint_events` avec le message d'erreur exact renvoyé par l'edge (au lieu de swallow).
   - Garder le message utilisateur court mais ajouter un lien "Nous écrire" (mailto) pour capturer les prospects malgré l'échec.

### Vérification
- `curl` la fonction avec le payload sprint → attendu HTTP 200 + `url` Stripe.
- Charger `/isolation-qc`, cliquer CTA → redirection Stripe Checkout.
- Vérifier `first_dollar_sprint_events` : `cta_clicked` puis (idéalement) plus de `cta_failed`.

### Hors scope
Refonte plus large de l'observabilité, leak detectors additionnels — reste réservée au prochain sprint post-première-vente.
