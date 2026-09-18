# Système éditorial au défilement — pages secondaires UNPRO

## 1. CONTEXTE
La home `/` reste strictement inchangée : logo, navigation minimale et Clara. Le projet possède déjà Framer Motion, des animations centralisées, `PageShell`, `SectionBlock`, le contrôle mobile et la prise en charge partielle de `prefers-reduced-motion`; il manque un système partagé pour les scènes collantes, les cartes empilées, le parallaxe léger et les transitions de fond.

Les pages observées utilisent encore surtout des suites de sections/cartes ordinaires. Certaines affichent aussi des chiffres statiques non reliés à une preuve de production (`/contractor`, `/comment-ca-marche`) : la refonte ne les mettra pas en valeur et les remplacera par des messages vérifiables.

## 2. OBJECTIF
Créer un langage de narration au défilement propre à UNPRO, puis l’appliquer aux pages secondaires qui expliquent le mieux la différence du produit. Le mouvement doit expliquer la progression Clara → compréhension → préparation → compatibilité → rendez-vous, sans scroll forcé et sans modifier les parcours réels.

## 3. UTILISATEURS
- Entrepreneurs qui doivent comprendre la qualité du jumelage avant d’ouvrir leur plan personnalisé.
- Entrepreneurs qui veulent savoir si l’IA comprend leur entreprise.
- Propriétaires qui découvrent le Passeport Maison.
- Visiteurs qui veulent comprendre le fonctionnement et les garanties de confiance d’UNPRO.

## 4. LIVRABLES
### Système réutilisable
Créer un module partagé de narration secondaire, composé de primitives cohérentes avec le code actuel :
- scène éditoriale pleine hauteur contrôlée;
- scène collante avec progression native;
- révélation groupée;
- média ou interface avec parallaxe limité;
- média collant + texte défilant;
- cartes empilées;
- panneau de viewport;
- transition de surface;
- révélation de texte par blocs;
- footer immersif « Housing Intelligence Grid ».

Ajouter un seul hook partagé de progression et un seul chemin reduced-motion. Étendre les réglages de mouvement existants plutôt que créer une seconde bibliothèque.

### Pages de la première migration
1. `/contractor` — priorité acquisition entrepreneur.
2. `/visibilite-ia-entrepreneurs` — récit « Est-ce que l’IA comprend votre entreprise? ».
3. `/proprietaires/passeport-maison` — récit de la mémoire de la propriété.
4. `/comment-fonctionne-ia` et `/entrepreneurs/comment-ca-marche` — transparence, compatibilité et parcours entrepreneur avec les mêmes primitives.

## 5. LOGIQUE
### Entrepreneur
Construire la progression :
```text
Vous n’avez pas besoin de plus de leads
→ Vous avez besoin des bons clients
→ Clara comprend l’entreprise
→ Services détectés et classés
→ Projet propriétaire préparé
→ Compatibilité analysée
→ Rendez-vous exclusif
→ Découvrez votre plan personnalisé
```
Réutiliser le vrai lien vers `/entrepreneur/plan-personnalise?objective=more_appointments` et `openAlex(...)`. Les états illustrés restent des représentations du produit existant, sans données d’entreprise, score, disponibilité ou rendez-vous inventés.

### Visibilité IA
Faire progresser les signaux réels déjà décrits sur la page : site, services, territoire, spécialités, preuves, profil structuré et préparation à la recommandation. Conserver formulaire, téléphone, instrumentation, FAQ et données structurées.

### Passeport Maison
Transformer photos, documents, équipements, projets, intervenants, entretien et observations en couches qui convergent vers le Passeport. Conserver le positionnement et les CTA existants; aucun document ou historique fictif.

### Clara contextuelle
Réutiliser le système Clara global. Chaque page transmet un contexte court et explicite au même compositeur : entrepreneur, visibilité IA, fonctionnement ou Passeport Maison. Aucun second chat.

## 6. DONNÉES
- Aucun changement de base de données, d’authentification, de paiement, de prix ou de fonctions serveur.
- Aucun chiffre, score, avis, client, projet, licence, disponibilité ou preuve fabriqué.
- Conserver les métadonnées, JSON-LD, canoniques et liens internes existants.
- Retirer des pages migrées les statistiques statiques non soutenues par une source de production; garder seulement les affirmations produit défendables.

## 7. UI/UX
- Direction : bleu nuit presque noir, surfaces architecturales nettes, blanc fort, accents cobalt mesurés, profondeur sobre; aucun style Semrush copié.
- Typographie éditoriale responsive via tokens et `clamp()`, sans redimensionnement direct selon la largeur dans les composants.
- Scènes principales de 80–110dvh sur grand écran; durées collantes raccourcies et parallaxe simplifié sur mobile.
- Aucun élément collant imbriqué, aucun scroll snap imposé, aucune vitesse de défilement modifiée.
- Parallaxe limité à 5–12 % et uniquement sur les médias/décors.
- Header secondaire minimal : comportement compact au défilement, retour au mouvement vers le haut, accès Clara visible; la home garde son header actuel.
- Footer immersif original : lignes de structure et signaux de logement, grand mot-symbole officiel UNPRO, vrais liens légaux/contact/navigation.
- États focus, contraste, clavier, lecteurs d’écran et zones tactiles préservés.

## 8. COMPOSANTS
- Construire les primitives dans un dossier partagé de présentation secondaire.
- Réutiliser `PageShell`, `SectionBlock`, `SmartHeader`, les boutons du design system, le logo officiel, `src/lib/motion.ts`, `DeferredAfterInteractive`, `MobileQAOverlay` et `visualStabilityLogger`.
- Adapter le footer existant au moyen d’une variante immersive réutilisable plutôt que créer un footer concurrent.
- Réutiliser les composants réels de service, profil, plan et Passeport lorsqu’ils existent; créer seulement des représentations statiques neutres quand aucune donnée utilisateur n’est montrée.

## 9. ACTIONS
- Le CTA entrepreneur ouvre le tunnel personnalisé existant avec objectif et provenance conservés.
- Les actions Clara ouvrent le vrai compositeur avec le contexte de la page.
- Les CTA du Passeport conservent leur route réelle.
- Les formulaires, appels, accordéons, liens internes et retours navigateur continuent de fonctionner.
- Journaliser avec les événements existants; aucune nouvelle mécanique parallèle.

## 10. CONTRAINTES
- Ne pas modifier `/`, `/index`, `/v2`, `/v3`, la conversation Clara, les tableaux de bord, l’admin, le checkout, Stripe, OTP, les formulaires applicatifs, les rendez-vous ou les paramètres de compte.
- Ne pas ajouter de route, de bibliothèque d’animation, de framework de défilement, de média lourd initial ou de système de chat.
- Respecter `PageShell`, les limites de sections, les tokens sémantiques, les thèmes et le chargement différé.
- Préserver le scroll natif, le SEO, le DOM sémantique et la lisibilité sans animation.

## 11. SUCCÈS
- La home est visuellement et fonctionnellement identique avant/après.
- Les cinq routes ciblées racontent une progression claire plutôt qu’une répétition de grilles de cartes.
- Aucun chiffre non prouvé ne subsiste sur les scènes migrées.
- Aucun débordement, panneau bloqué, carte épinglée, saut, clignotement ou contenu caché sous le dock.
- Reduced motion affiche tout immédiatement, sans parallaxe ni grandes transformations.
- Les CTA entrepreneur, Clara et Passeport atteignent leurs parcours existants avec leur contexte intact.
- Le chargement initial ne récupère pas les scènes des pages secondaires sur la home.

## 12. TÂCHES
1. Capturer les états de référence des cinq routes et figer la home par test de non-régression.
2. Ajouter les primitives, progression native, reduced-motion et variante de footer au système existant.
3. Migrer `/contractor` en premier et vérifier le plan personnalisé + Clara.
4. Migrer `/visibilite-ia-entrepreneurs` en conservant formulaire, téléphone, instrumentation et SEO.
5. Migrer `/proprietaires/passeport-maison` avec les composants et textes Passeport existants.
6. Migrer les deux pages d’explication avec la même grammaire visuelle et retirer les statistiques non prouvées.
7. Tester à 390, 430, format iPhone, 768 et 1280 px : défilement lent/rapide, barre glissée, recharge à mi-page, retour/avance, rotation, redimensionnement et reduced motion.
8. Vérifier les parcours réels, le focus clavier, l’absence de débordement, les erreurs console/runtime et les signaux Mobile QA.
9. Exécuter les tests ciblés, tests complets, types, lint critique et compilation; réparer jusqu’au vert.
10. Laisser pour une migration suivante : `/pim` long format, copropriété/gestionnaires, partenaires/affiliés, campagnes et pages éditoriales — après validation des primitives sur cette première cohorte.
