

# Enrichir les FAQ avec liens programmes, CTA admissibilité et détails

## Problème
Les FAQ (blog articles et pages SEO) mentionnent des programmes gouvernementaux (Rénoclimat, LogisVert, Canada Greener Homes) en texte brut. Aucun lien vers le programme, aucun CTA "Vérifier mon admissibilité", aucun détail.

## Solution

### 1. Créer un service de détection et enrichissement de programmes
**Fichier:** `src/services/grantLinkingService.ts`

- Dictionnaire des programmes connus avec: nom, URL officielle, route UNPRO (`/dashboard/properties/:id/grants`), description courte
- Fonction `enrichTextWithGrantLinks(text: string): EnrichedSegment[]` qui détecte les noms de programmes dans du texte et retourne des segments (texte brut + liens)
- Programmes: Rénoclimat, LogisVert, Canada Greener Homes, Chauffez vert, Novoclimat, SCHL

### 2. Créer un composant `GrantMentionCard`
**Fichier:** `src/components/grants/GrantMentionCard.tsx`

- Card compacte affichée quand un programme est mentionné dans une FAQ
- Contenu: nom du programme, description 1 ligne, lien officiel externe, CTA "Vérifier mon admissibilité" (vers `/dashboard/properties` ou login si non connecté)
- Style premium, cohérent avec le design existant

### 3. Créer un composant `EnrichedFaqAnswer`
**Fichier:** `src/components/grants/EnrichedFaqAnswer.tsx`

- Remplace le texte brut des réponses FAQ
- Détecte les mentions de programmes via `grantLinkingService`
- Rend les noms de programmes comme liens cliquables
- Affiche un `GrantMentionCard` groupé sous la réponse si des programmes sont détectés

### 4. Mettre à jour `BlogArticlePage` FaqItem
Modifier le composant `FaqItem` dans `BlogArticlePage.tsx` pour utiliser `EnrichedFaqAnswer` au lieu de rendre la réponse en texte brut.

### 5. Mettre à jour `SeoFaqSection`
Modifier `SeoFaqSection.tsx` pour utiliser `EnrichedFaqAnswer` dans `AccordionContent`, enrichissant toutes les pages SEO (problèmes, villes, services, rénovations).

## Résultat
- Chaque mention de programme dans une FAQ devient un lien
- Un mini-card apparaît avec "Voir les détails" + "Vérifier mon admissibilité"
- Fonctionne sur toutes les pages (blog + SEO) automatiquement
- Les liens officiels ouvrent dans un nouvel onglet
- Le CTA admissibilité dirige vers le dashboard propriétaire

