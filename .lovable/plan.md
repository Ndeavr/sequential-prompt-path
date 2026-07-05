## Plan de correction — Scan IA

### Objectif
Rendre `/scan-ia/scan` fonctionnel immédiatement : plus de `Failed to send a request to the Edge Function`, et un rapport généré même si le scanner profond est indisponible.

### Ce que j’ai constaté
- Le navigateur appelle bien `scan-ia-run`, mais la requête échoue avant d’obtenir une réponse HTTP exploitable (`Failed to fetch`).
- Il n’y a aucun log récent côté fonction pour `scan-ia-run`, ce qui indique très probablement une fonction non déployée, mal routée, ou bloquée avant exécution.
- Le code actuel dépend aussi d’un appel interne à `aipp-real-scan`; même si ce scanner échoue, le tunnel public doit continuer avec un rapport déterministe.

### Étapes de correction
1. **Déployer et vérifier les fonctions Scan IA**
   - Déployer `scan-ia-run` et `scan-ia-activate`.
   - Tester `scan-ia-run` directement avec `Isroyal.ca`.
   - Vérifier les logs backend après test.

2. **Rendre `scan-ia-run` robuste**
   - Ajouter une réponse `OPTIONS` propre avec statut 200 et CORS complet.
   - Ne jamais laisser l’appel à `aipp-real-scan` bloquer le tunnel public.
   - Retourner un rapport déterministe si Firecrawl/AIPP/scan profond échoue.
   - Remplacer les messages techniques par une erreur produit courte et utile.

3. **Vérifier les permissions de données**
   - Confirmer que `scan_ia_reports`, `contractor_market_opportunity` et `ai_recommendation_rank` sont accessibles à la fonction via le backend.
   - Corriger les grants/RLS si nécessaire, sans exposer les rapports privés publiquement.

4. **Améliorer l’UX d’erreur mobile**
   - Remplacer `Failed to send a request to the Edge Function` par une phrase française non technique.
   - Préserver l’input saisi.
   - Afficher un fallback clair : “Analyse temporairement ralentie. Réessayez dans un instant.”

5. **Validation finale**
   - Rejouer le parcours mobile `/scan-ia/scan` avec `Isroyal.ca`.
   - Confirmer que la navigation vers `/scan-ia/rapport?st=...` fonctionne.
   - Confirmer que le rapport affiche score, opportunité marché et simulation Alex.

### Résultat attendu
L’utilisateur entre `Isroyal.ca`, clique “Scanner”, et obtient un rapport Scan IA sans voir d’erreur technique, même si un service d’analyse secondaire est temporairement indisponible.