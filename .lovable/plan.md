# P0 — Build vert, puis correction des 11 problèmes détectés

## État vérifié maintenant

La compilation passe déjà : la vérification TypeScript complète du projet vient de se terminer sans aucune erreur. L'erreur de `src/components/voice/OverlayAlexVoiceFullScreen.tsx` visible sur la capture était due à un import manquant (`CLARA_VOICE_CLOSED_EVENT`), corrigé au tour précédent. La transition Clara texte/voix est conservée intacte.

Les « 10 issues » affichées sont les problèmes de surveillance du projet : il y en a 11 en attente. Aucun n'est une erreur de compilation. Voici le plan pour les corriger avant de reprendre le parcours entrepreneur.

## Correctifs, par ordre d'impact

### Bloquants (revenus / données)
1. Tableau de bord entrepreneur vide — la base refuse d'exécuter la vérification de propriété `owns_contractor`. Migration : accorder l'exécution à `authenticated` et `service_role`.
2. Profils publics indexés IA vides (services, avis, médias) — même cause avec `aipp_is_published`. Migration : accorder l'exécution à `anon` et `authenticated`.
3. Suivi des envois (SMS/courriels envoyés, livrés, échoués) jamais enregistré — l'index d'unicité partiel empêche l'insertion. Migration : rendre l'index non partiel (ou insertion sans `onConflict`).
4. Devis personnalisé bloqué à la première étape quand l'entreprise n'apparaît pas dans la liste — rendre la saisie manuelle toujours accessible, pas seulement lorsque la recherche ne retourne rien.
5. Affilié ne peut plus appeler ses prospects — la liste des statuts téléphoniques acceptés ne correspond pas aux valeurs réellement utilisées ; l'aligner et n'exclure que les numéros invalides ou « ne pas contacter ».
6. Estimateur de rénovation : la sauvegarde échoue quand la superficie sort des bornes — borner la valeur côté page et afficher un message précis sur le champ.

### Moyens
7. Conversations Clara longues : au rechargement, seuls les 40 plus anciens messages reviennent — charger les 40 plus récents et les remettre en ordre chronologique.
8. Marqueur technique `[[CHOIX: ...]]` visible dans les autres surfaces de chat — le retirer dans le nettoyage de texte commun utilisé partout.
9. Prix annuel « 0 $/an » dans le paiement de la page d'atterrissage — masquer l'option annuelle quand le plan n'a pas de prix annuel.
10. Bouton « Appeler » toujours grisé dans le CRM admin — calculer la permission d'appel à partir des données de la ligne au lieu de la forcer à faux.
11. Entreprises de nettoyage de planchers/céramique/sous-sol rejetées de l'offre gratuite — vérifier d'abord les mots-clés de catégorie, n'appliquer l'exclusion des métiers de construction qu'ensuite.

## Vérification
- Compilation, types, tests ciblés et lint après chaque groupe de correctifs.
- Vérification mobile (390 px) du chat Clara et du parcours entrepreneur.
- Aucune donnée de test laissée en production, aucun envoi réel déclenché, Stripe en mode test uniquement.

## Ensuite seulement : reprise du parcours entrepreneur
Clara → analyse d'entreprise → transition naturelle → formulaire complet → sauvegarde → profil → objectifs → plan personnalisé → paiement/tableau de bord, en réparant l'implémentation existante : aucun deuxième parcours, aucune nouvelle route, aucune nouvelle table.

## Détails techniques
- 3 migrations : `GRANT EXECUTE ON FUNCTION public.owns_contractor(uuid)`, `GRANT EXECUTE ON FUNCTION public.aipp_is_published(uuid)`, index unique non partiel sur `contractor_funnel_events.dedupe_key`.
- Front : `PageContractorPricingIntake.tsx`, `PageAffiliateActionMode.tsx`, `PageRenovationEstimator.tsx`, `InlineCheckoutNuclear.tsx`, `ManualContactQueue.tsx`, `sanitizeAlexText.ts`.
- Edge : `_shared/contactPermissions.ts`, `clara-session/index.ts` (pagination `loadMessages`), `_shared/funnelEvents.ts`, `_shared/localServiceCategories.ts` + `src/lib/localServices/categories.ts`.
