## Problème

L'erreur "Failed to send a request to the Edge Function" sur `/admin/acquisition-funnel` provient du fait que la fonction `acquisition-pipeline-audit` n'est **pas déployée** (404 `NOT_FOUND` confirmé via curl). Le fichier existe dans `supabase/functions/acquisition-pipeline-audit/index.ts` mais le déploiement initial a échoué silencieusement.

## Correctif

1. **Forcer le redéploiement** de `acquisition-pipeline-audit` en re-sauvegardant le fichier (touch léger — ajout d'un commentaire de version en tête) pour que Lovable Cloud le redéploie automatiquement.
2. **Ajouter une gestion d'erreur visible** dans `PageAdminAcquisitionFunnel.tsx` :
   - Afficher le message réel de l'erreur (status, body) au lieu du toast générique.
   - Bouton "Lancer l'audit" : afficher état `loading` + désactivation pendant l'appel.
3. **Vérifier post-déploiement** via `supabase--curl_edge_functions` puis lecture des logs si erreur runtime (probable manque de données dans `contractor_leads`, mais la fonction doit retourner 200 même avec 0 leads).

## Hors scope

- Pas de changement au schéma DB ni à la logique d'audit (les 9 phases restent identiques).
- Pas de refonte UI du dashboard.

## Détails techniques

- Le `supabase/config.toml` n'a pas besoin de bloc pour cette fonction (defaults OK : `verify_jwt = false` n'est pas requis car l'appel passe via `supabase.functions.invoke` avec la session admin).
- Le toast d'erreur sera enrichi avec `error.message` + `error.context?.body` pour le debugging futur.

Confirmes-tu que je procède au correctif ?
