# Plan — Article éditorial UNPRO : stratégie fournisseur de peinture

## 1. Objectif

Ajouter à l’existant UNPRO un article éditorial premium intitulé :
**« Comment un fournisseur de peinture a augmenté ses ventes en aidant ses entrepreneurs à décrocher plus de contrats »**.

L’article doit renforcer le positionnement central : **La fin des 3 soumissions. Un projet. Un bon match. Un PRO.** Il s’adresse aux fabricants, distributeurs et fournisseurs de peinture ainsi qu’aux entrepreneurs résidentiels québécois.

## 2. Architecture retenue

Réutiliser exactement l’architecture des articles éditoriaux statiques existants (ex. `PageMoinsSoumissionsPlusFactures.tsx`) :

- Page statique React + TypeScript dans `src/pages/articles/`.
- `Helmet` pour le SEO social (title, description, canonical, Open Graph, Twitter).
- `SectionArticleStructuredData` pour JSON-LD `Article` + `BreadcrumbList`.
- `SectionArticleFAQSEO` pour AEO/FAQPage.
- `SectionArticleInternalLinksSEO` pour maillage interne.
- Tracking CTA dans `entrepreneur_cta_events`.
- Image hero générée dans `src/assets/articles/`.

## 3. Slug et métadonnées proposées

- **Slug** : `fournisseur-peinture-plus-contrats`
- **Route** : `/articles/fournisseur-peinture-plus-contrats`
- **Titre** : `Comment un fournisseur de peinture a augmenté ses ventes en aidant ses entrepreneurs à décrocher plus de contrats`
- **H1** : identique au titre
- **Description** : "Un fournisseur de peinture a transformé sa relation avec ses entrepreneurs en les aidant à obtenir plus de contrats résidentiels avec UNPRO. Voici la mécanique."
- **Date** : 2026-08-19
- **Catégorie** : "Fournisseurs / Entrepreneurs"
- **Lecture** : ~10 min
- **Comptage de mots** : ~1400

## 4. Livrables

### 4.1 Page éditoriale

Fichier : `src/pages/articles/PageFournisseurPeinturePlusContrats.tsx`

Sections prévues, basées sur le texte fourni :

1. **Hero** : titre, date, catégorie, image hero.
2. **Intro** : la formule traditionnelle (produits, rabais, service) et le problème caché.
3. **Le problème caché** : volume d’achat lié au nombre de chantiers.
4. **Changement de stratégie** : agir plus haut dans la chaîne, donner plus de travail aux clients.
5. **Comment UNPRO change la donne** : un propriétaire sérieux + le bon entrepreneur + rendez-vous exclusif.
6. **Exemple concret** : propriétaire de Laval, peintre recommandé par le fournisseur, commande de peinture.
7. **Cercle vertueux** : diagramme visuel (recrutement → UNPRO → occasions → chantiers → achats → fidélité).
8. **Le changement de discours** : comparatif « 15 % de rabais » vs « on vous aide à obtenir des contrats ».
9. **Fidélisation plus profonde** : le fournisseur devient partenaire de croissance.
10. **Intelligence commerciale** : tendances locales (Terrebonne, Laval, Montréal, etc.).
11. **Extension à d’autres métiers** : isolation, toiture, plomberie, etc.
12. **Conclusion** : la nouvelle génération de programmes de fidélisation.
13. **CTA** : boutons vers `/entrepreneur/devis-personnalise` et `/entrepreneur/garantie`.
14. **FAQ** : 4-5 questions AEO (ex. "Pourquoi un fournisseur de peinture devrait-il aider ses entrepreneurs à vendre?", "Qu’est-ce qu’un rendez-vous exclusif UNPRO?", etc.).
15. **Maillage interne** : liens vers les articles et pages entrepreneur existants.

### 4.2 Image hero

Fichier : `src/assets/articles/fournisseur-peinture-plus-contrats.jpg`

Description visuelle : photographie documentaire réaliste d’un entrepreneur-peintre québécois dans une camionnette ou un comptoir de fourniture de peinture, avec des pots de peinture et des échantillons de couleurs, ambiance fin de journée, lumière naturelle douce, ton chaleureux et professionnel.

### 4.3 Intégrations dans le projet existant

- `src/app/router.tsx` : ajouter `PageFournisseurPeinturePlusContrats` en lazy import et route `/articles/fournisseur-peinture-plus-contrats`.
- `src/pages/articles/PageArticlesRecentCompressedFeed.tsx` : ajouter l’article dans le tableau `EDITORIALS`.
- `scripts/generate-sitemaps.ts` : ajouter le slug dans la liste des routes statiques indexables si un tableau de ce type existe.
- Pages d’articles connexes : ajouter un lien vers le nouvel article dans les `INTERNAL_LINKS` de `PageMoinsSoumissionsPlusFactures.tsx` et autres pages statiques pertinentes (optionnel mais recommandé pour le maillage).

## 5. Composants et dépendances réutilisés

- `Helmet` de `react-helmet-async`
- `Link`, `useNavigate` de `react-router-dom`
- `motion` de `framer-motion`
- `Button`, `Card` de shadcn/ui
- `SectionArticleStructuredData`, `SectionArticleFAQSEO`, `SectionArticleInternalLinksSEO`
- `supabase` client pour `entrepreneur_cta_events`

## 6. Contraintes respectées

- **Positionnement** : ne jamais présenter UNPRO comme une plateforme de leads ou un comparateur de soumissions.
- **Vérité** : ne pas inventer de statistiques, chiffres ou témoignages non fournis. Utiliser des formulations pédagogiques et qualifiées ("exemple", "illustration", "modèle").
- **Français québécois** : respecter la localisation fr-CA.
- **Réutilisation** : ne pas dupliquer la logique d’architecture, réutiliser les composants existants.
- **SEO/AEO/GEO** : JSON-LD, canonical, OG, FAQ, internal links.
- **CTA** : diriger vers les funnels entrepreneur existants, pas de nouvelle logique de paiement.

## 7. Tâches d’implémentation

1. Générer l’image hero avec `imagegen--generate_image`.
2. Créer `src/pages/articles/PageFournisseurPeinturePlusContrats.tsx` avec le contenu structuré.
3. Ajouter le lazy import et la route dans `src/app/router.tsx`.
4. Ajouter l’article dans `EDITORIALS` de `PageArticlesRecentCompressedFeed.tsx`.
5. Mettre à jour `scripts/generate-sitemaps.ts` si applicable.
6. Vérifier le build, le SEO, les CTAs et le rendu mobile via un test navigateur.

## 8. Succès

Terminé quand :

- L’article est accessible à `/articles/fournisseur-peinture-plus-contrats`.
- Les balises SEO, Open Graph, JSON-LD et canonical sont présentes.
- Les CTAs fonctionnent et mènent aux pages entrepreneur existantes.
- L’article apparaît dans la liste « Analyses UNPRO ».
- Le build passe sans erreur.
- Le rendu mobile est correct et lisible.
