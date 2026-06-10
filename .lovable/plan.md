## Repositionnement PIM — Mémoire de la maison

Objectif: retirer toute formulation "IA/analysé/lisible par l'IA/intelligence" des surfaces publiques PIM et la remplacer par mémoire, historique, continuité, patrimoine, valeur, tranquillité d'esprit. L'IA reste en arrière-plan.

Hero retenu (principal): « Votre maison possède désormais sa propre mémoire. » + sous-titre Variante A. (Décision rapide, pas de blocage — peut être ajustée après revue.)

### Fichiers à modifier (UI/contenu uniquement)

1. `src/components/pim/HeroSectionPIMLanding.tsx`
   - Pill: `PIM · Passeport Intelligence Maison` → `PIM · Le carnet de vie de votre maison`
   - H1: « Votre maison possède désormais sa propre mémoire. » (mot final en gradient: « mémoire »)
   - Sous-titre: « Chaque intervention, document et décision importante est conservé automatiquement dans un dossier unique qui évolue avec votre propriété. »
   - Commentaire `Graphe d'intelligence` → `Graphe mémoire`.

2. `src/components/pim/SectionFragmentedProblem.tsx`
   - Carte « Zéro intelligence long terme » → titre « Aucune mémoire à long terme », body « Chaque décision repart de zéro. Aucune trace du passé, aucune continuité d'une rénovation à l'autre. »
   - Purger toute occurrence "IA" dans les autres cartes (revue rapide, reformulation neutre si présente).

3. `src/components/pim/SectionHowPIMWorks.tsx`
   - Étape 03 « L'IA analyse votre propriété » → « Votre maison conserve son histoire » — body: « Travaux, garanties, inspections et équipements s'ajoutent automatiquement à un historique clair et durable. »
   - Étape 04 « Recommandations et intelligence » → « Continuité et tranquillité d'esprit » — body: « Vous retrouvez en un instant ce qui a été fait, quand, par qui et avec quelles garanties. »
   - Phrase « en intelligence vivante » → « en mémoire vivante ».

4. `src/components/pim/SectionNotCloudStorage.tsx`
   - « infrastructure d'intelligence résidentielle » → « dossier vivant de votre propriété ».
   - Tag « Diagnostics IA » → « Équipements ».
   - Reformuler corps pour parler de mémoire/historique vs stockage.

5. `src/components/pim/SectionAlexCapabilities.tsx`
   - Repositionner la section comme « Votre maison se souvient de » avec liste demandée (Rénovations, Factures, Garanties, Soumissions, Inspections, Entretiens, Équipements, Subventions, Entrepreneurs recommandés, Documents importants).
   - Supprimer mention « l'IA les voit ». Reformuler en bénéfice humain (« Vous retrouvez immédiatement… »).

6. `src/components/pim/SectionPIMFinalCTA.tsx`
   - Titre: « Commencez à bâtir la mémoire de votre maison. »
   - Sous-titre: « Gratuit. Moins de 30 secondes. Aucun engagement. »
   - Bouton: « Créer mon Passeport Maison ».
   - Retirer « mémoire et intelligence » → « mémoire et continuité ».

7. Nouvelle section émotionnelle `src/components/pim/SectionPIMEmotional.tsx` (ajoutée à `PagePIMLanding.tsx` entre `SectionNotCloudStorage` et `SectionAlexCapabilities`):
   - « Une maison accumule des souvenirs. Mais les documents se perdent. Les garanties disparaissent. Les rénovations sont oubliées. Le Passeport Intelligence Maison conserve l'histoire complète de votre propriété afin que rien d'important ne soit perdu. »

8. Nouvelle section bénéfices `src/components/pim/SectionPIMBenefits.tsx` (4 cartes: Mémoire permanente, Historique complet, Valeur protégée, Documents organisés) injectée après le Hero.

9. `src/pages/PagePIMLanding.tsx`
   - Meta description, OG, JSON-LD (Service.description, FAQ Q1/Q2/Q3, serviceType) réécrits sans « IA / lisible par l'IA / infrastructure d'intelligence ». Nouveau wording: « dossier vivant », « mémoire numérique », « historique de votre propriété ».
   - Importer et ordonner les nouvelles sections: Hero → Benefits → FragmentedProblem → HowPIMWorks → NotCloudStorage → Emotional → AlexCapabilities (renommée « Votre maison se souvient de ») → ForOrganizations → FinalCTA.

10. `src/components/pim/PIMIntroBand.tsx` (bandeau homepage)
    - Titre: « Votre maison possède désormais sa propre mémoire. »
    - Sous-titre: « Conservez rénovations, garanties, inspections, soumissions et documents importants au même endroit. » (déjà proche — ajuster.)
    - Label pill: « Nouveau · Passeport Maison ».

11. `src/components/pim/PropertyIntelligenceGraph.tsx`
    - Commentaire/legend interne: remplacer « diagnostics IA » par « équipements / entretiens ». Aucun changement visuel structurel.

### Hors scope
- Pas de modification logique ni backend.
- `SectionForOrganizations` conservée; revue ciblée pour purger « IA » si trouvée.
- Autres pages listées par le grep (PageWhyUnpro, ad-landing, etc.) ne sont PAS touchées — seul le contexte PIM est demandé.

### Critères de succès
- Aucune occurrence de « IA », « intelligence artificielle », « lisible par l'IA », « analysé par l'IA », « infrastructure d'intelligence » dans `src/components/pim/**` et `src/pages/PagePIMLanding.tsx`.
- Hero, sections, CTA, meta, JSON-LD alignés sur le lexique mémoire/historique/patrimoine/tranquillité.
- Nouvelle section émotionnelle et liste « Votre maison se souvient de » présentes.
