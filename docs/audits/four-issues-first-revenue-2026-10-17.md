# Quatre alertes — état local, aucune publication

## Périmètre et source

Source inspectée : `d1041a94c35aa7981b6016a092b9c1e8a1d079a2`. Les corrections paiement 350 $, webhooks, migrations, permissions et tarifs restent inchangés. Aucune écriture distante, génération IA, session Stripe, campagne, notification ou publication dans ce tour.

## P0 RBQ — corrigé localement

- Cause : `getRbqApplicability` utilisait `includes("gaz")`, donc « gazon » devenait du gaz réglementé. Le tableau pro actif utilise ce helper via `getRbqDashboardState`, `ProNextActionCard` et `RbqSituationSelector`.
- Après : gaz est un mot entier; propane/gazeux restent réglementés. Tonte/pelouse/entretien de gazon/paysagement seuls sont non assujettis sous réserve de travaux réglementés. Une activité inconnue ajoutée ne reçoit pas automatiquement l'exemption; les mélanges réglementés restent requis.
- Libellé : « Ma profession ne requiert pas de licence RBQ », statut INFERRED, jamais VERIFIED ni admissibilité réglementée.
- Serveur : `match-lead/gates.ts` exige toujours numéro, statut verified, horodatage et non-expiration; `match-lead/index.ts` filtre ces champs. Aucun substring gaz/gazon trouvé dans cette porte. Métadonnées production lues : paysagement rbq_required=false, hvac/plombier=true. Aucun changement de politique serveur.

## P0 Clara — logique corrigée, limite mobile ouverte

- Cause : `PageHomeLight.onStartHomeowner` cherchait un bouton `clara-back-to-home-project` absent du composant actuel. Le rôle restait contractor.
- Après : événement explicite vers le composant existant; voix fermée, qualification suspendue sans effacement, audienceRef/audience/mode/workflow/current_intent/detected_role synchronisés. Le choix est conservé dans le stockage du flux existant lié au jeton. L'historique reste affiché mais n'est pas utilisé pour reclassifier le nouveau tour propriétaire. Les réponses alex-chat arrivant après un changement de rôle sont ignorées.
- Vérification publique en lecture : `/` HTTP 200, bundle `index-Bqztienk.js`, x-deployment-id `psr2.91565206-a6c6-46fe-ba06-b7f14348cad3.1792877489.jzuSzwgb4i9NMsWmiL2ZHrV9E-Q1rGL1Apw3aZRoufk`; les CTA FR sont présents dans le bundle. Ceci ne prouve pas que les corrections locales sont publiées ni le SHA exact du site.
- Navigateur FR-CA 360/390, vrais composants et routeur, tous services externes interceptés : contractor → activation DOM du vrai CTA homeowner → message → réponse → refresh; userRole=homeowner, aucun contractorQualification ni ancien « Je suis entrepreneur » dans les messages envoyés; zéro erreur pageerror. Captures `/tmp/browser/four/clara-360.png` et `clara-390.png` inspectées.
- **Limite réelle** : le clic tactile sur le CTA de section est intercepté par le chat mobile plein écran. La validation a donc utilisé `element.click()` sur le vrai bouton, pas un clic utilisateur réussi. Ce défaut d'accès reste ouvert; navigation aller-retour et vraie voix ne sont pas validées. Les panneaux DEV ont été rendus non interceptants dans le test seulement, sans changement d'UI publique.
- L'aperçu supervisé avait des 504 « Outdated Optimize Dep »; le test a utilisé un serveur Vite local isolé avec cache distinct. Aucun build manuel ni modification de configuration du projet.

## P1 adresses — raccord corrigé, fournisseur non validé

- Cause confirmée : `GooglePlacesInput` employé par urgence, décrire projet et home-score envoyait predictions/details sans session_token. Le serveur exige Auth ou un jeton présent dans `alex_sessions`. Le service d'accès pouvait aussi retourner un jeton local non confirmé.
- Après : réutilisation de `useAddressAutocomplete` (sanitisation, cache, délai et gestion d'erreurs existants), démarrage canonique confirmé de session invitée; détails, coordonnées et code postal réellement lus dans la réponse. Un échec de détails ne crée plus une fausse adresse confirmée.
- États : chargement, zéro proposition, indisponibilité explicite; saisie conservée. Aucune clé Google ajoutée au navigateur. Aucun relâchement auth/RLS : proxy existant, limites invité 15 predictions / 6 details par dix minutes et RPC de réservation inchangés.
- Tests composants signed-out avec réponses simulées : jeton confirmé, predictions puis details, coordonnées, refus fournisseur, échec de détails sans confirmation. **Pas de requête Google réelle**, donc clé serveur/restrictions et résultat fournisseur réels non validés; pas de parcours mobile des trois formulaires validé.

## P2 modèles — inventaire seulement

Catalogue authentifié `/v1/models` consulté sans inference; workspace_models=included. Aucun modèle/coût/token remplacé.

| Circuit dans la source | Modèle | Catalogue |
|---|---|---|
| alex-chat + alex-voice-brain | google/gemini-3-flash-preview | présent, deprecated=false |
| visual-analysis / analyze-quote-comparative / analyse auxiliaire design | google/gemini-2.5-flash | présent, deprecated=true |
| design-generate image | google/gemini-2.5-flash-image | présent, deprecated=true |

Aucune date de retrait retournée pour ces modèles. `created` du catalogue n'est pas une date de retrait. Aucun appel d'inférence exécuté : présence au catalogue ne prouve pas réussite du circuit déployé. Aucun log reçu pour alex-chat/google-places lors de l'inspection antérieure du tour.

Inventaire lexical de tous les fichiers Edge (sites source, pas trafic runtime) : 54 flash-2.5, 7 flash-lite-2.5, 1 pro-2.5, 3 flash-image-2.5, 18 flash-preview-3, 2 flash-image-preview-3.1, 1 gpt-image-2, 3 text-embedding-3-small, 2 chirp_2, 2 latest_long, 1 gemini-3.1-flash-live-preview. Le trafic effectif et les branches dynamiques ne sont pas établis par ces comptes. Migration différée; aucune panne de modèle prouvée.

## Fichiers modifiés

- src/lib/compliance/rbqStatus.ts
- src/lib/compliance/rbqDeclaration.ts
- src/services/clara/claraContractorResume.ts
- src/components/home-light/ClaraConversationBox.tsx
- src/pages/PageHomeLight.tsx
- src/services/addressAccessToken.ts
- src/components/property/GooglePlacesInput.tsx
- src/test/rbq-applicability.test.ts
- src/test/four-issues-address.test.tsx
- src/test/four-issues-role-resume.test.ts
- AGENTS.md, roadmap.md et le présent rapport

## Tests et release gate

- Première exécution : 58/58 sur six fichiers (RBQ, rôles Clara, adresses).
- Régression avec QA 350 $ isolé : 65/65 sur sept fichiers, dont 15 scénarios handlers signés/RLS SQL du harness existant; ceci ne devient pas un E2E Auth/PostgREST/Edge hébergé.
- Build automatique : dernier signal lu avant rapport `build OK` à 21:17:27Z. Aucun build/typecheck manuel (le harness les gère); aucune preuve de typecheck autonome, lint complet ou de compilation distante.
- Test mobile logique avec fixtures : succès 360/390, **clic tactile de section non réussi** (voir ci-dessus). Aucun test physique, voix réelle ni fournisseur Google.

**Aucune publication.** Prochaine action exacte : valider l'accès tactile au CTA propriétaire et les trois formulaires d'adresse en QA isolée; le release gate 350 $ exige toujours ensuite une stack Auth/PostgREST/Edge complète gratuite avec deux identités synthétiques, sans données production ni paiement.