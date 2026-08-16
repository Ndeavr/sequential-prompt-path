# Passeport Maison — « Vous prenez soin de votre maison. Prouvez-le. »

Repositionner le Passeport Maison existant en **mémoire documentée + preuve d'entretien**, sans reconstruire l'architecture.

## Ce qui existe déjà (audité)

- Route publique `/proprietaires/passeport-maison` → `PropertyGraphPage` (graphe technique, pas un récit propriétaire).
- Route privée `/dashboard/properties/:id/passport` → `PropertyPassportPage` (6 modules en onglets : identité, systèmes, rénovations, journal d'entretien, coffre documents, Home Score).
- Composants `src/components/passport/*` dont `MaintenanceTimeline`, `DocumentVault`, `AddEventDialog`, `AddDocumentDialog`.
- Tables : `properties`, `property_events` (type, titre, date, coût, entrepreneur, metadata), `property_documents` (avec `extracted_json`), `property_recommendations`, `property_passport_sections` (score de complétude pondéré, 5 sections), `pim_warranties`, `pim_inspections`, `pim_maintenance_history`.
- Analytics : `src/services/eventTrackingService.ts` (`trackEvent`, catégorie `passport` déjà utilisée).
- Extraction documentaire : edge function `extract-document-entities` (règles par type : inspection, facture, soumission, taxes).
- Copie centralisée : `src/lib/copy/passportPositioning.ts` ; section homepage `SectionPasseportMaison` dans `HomeFin3Sections.tsx`.

Constat : la matière existe, mais elle est présentée comme un gestionnaire de fichiers avec onglets. Il manque le récit (Aujourd'hui / Demain / Le jour où vous devez le prouver), la timeline unique, la provenance affichée et le dossier partageable.

## 1. Copie et positionnement

Étendre `passportPositioning.ts` (source unique, aucun texte en dur ailleurs) :
- H1 : « Votre maison a une histoire. Conservez-la. »
- Variante courte : « Vous prenez soin de votre maison. Prouvez-le. » + sous-texte dossier de santé.
- CTA canonique : « Créer mon Passeport Maison ».
- Bloc des 3 périodes de valeur, bloc revente, liste de ce que le Passeport contient.
- Formulations de prudence obligatoires : jamais de promesse de valeur marchande, de taxes ou de financement. Uniquement « un historique documenté peut vous aider à démontrer… ».

Appliquer sur : section homepage (`SectionPasseportMaison`), `/proprietaires/passeport-maison`, en-tête du passeport dashboard, CTA du dashboard propriétaire. Aucun duplicata de contenu.

## 2. Page publique `/proprietaires/passeport-maison`

Garder le graphe mais le reléguer plus bas. En haut : hero nouveau positionnement, puis les 3 périodes (Aujourd'hui / Demain / Le jour où vous devez le prouver), puis le bloc revente émotionnel, puis CTA. Metadata SEO mise à jour (title/description/OG).

## 3. Timeline « L'histoire de votre maison »

Nouveau composant `PropertyStoryTimeline` (mobile-first), alimenté par une source unifiée en lecture seule :
`property_events` + `property_documents` + `pim_warranties` + `pim_inspections` + `pim_maintenance_history`, fusionnés côté client par année décroissante.

Chaque entrée : date, catégorie, titre, entrepreneur si connu, montant si connu, pièces jointes (documents/photos), garantie liée, badge de provenance. Aucune donnée fabriquée ; les champs absents ne s'affichent pas.

La timeline devient l'onglet par défaut du passeport ; les modules actuels restent accessibles.

## 4. Provenance

Ajouter une colonne `provenance` sur `property_events` (`verified` | `declared` | `inferred` | `unconfirmed`, défaut `declared`), avec grants et politiques alignés sur l'existant. Badge réutilisable `ProvenanceBadge` affiché sur timeline, entretiens suggérés, dossier imprimable.
- `verified` = pièce justificative rattachée.
- `inferred` = généré par le système, jamais présenté comme un fait.

## 5. Entretien préventif « À prévoir pour votre maison »

Réutiliser `property_recommendations` et le moteur de complétude existant. Chaque suggestion affiche sa justification réelle (« dernière intervention enregistrée en 2018 ») et son niveau de certitude. Si les données sont insuffisantes → « À confirmer », jamais de durée de vie inventée.

Actions : « J'ai déjà fait cet entretien » et « Ajouter une preuve d'entretien » → créent un `property_events` (pas de table parallèle) et rafraîchissent la timeline.

## 6. Moment « wow » après upload

Brancher l'upload existant sur `extract-document-entities` : identifier le type, extraire uniquement les champs fiables, proposer un événement pré-rempli, demander confirmation avant écriture, puis rattacher garantie ou action future détectée. Une recommandation d'inspecteur devient un élément « à surveiller », jamais un diagnostic. Échec d'extraction ou document non reconnu → le document est quand même sauvegardé, saisie manuelle proposée sans message d'erreur technique.

## 7. Dossier de ma propriété

Étendre `PropertyReportPage` existante (ne pas créer un second rapport) : identification, résumé, historique documenté, rénovations, réparations, inspections, entretiens, garanties connues, documents, photos, éléments à confirmer. Mention « Généré à partir du Passeport Maison UNPRO » + date. Impression/PDF via la mise en page print, plus un partage par lien à durée limitée réutilisant l'infrastructure de partage existante si elle est présente ; sinon, téléchargement seulement. Séparation explicite vérifié / déclaré / inféré.

## 8. Dashboard propriétaire et mobile

Carte Passeport en tête du dashboard : événements, documents, garanties, entretiens à prévoir, éléments à compléter, CTA dynamique « Continuer mon Passeport ». Le score de complétude existant est conservé et expliqué (pas de nouveau score gamifié).

Sur mobile : bouton persistant « + Ajouter à ma maison » avec choix rapide (facture, photo, réparation, rénovation, inspection, garantie, entretien, autre) branché sur l'upload existant.

## 9. Alex

Ajouter au prompt propriétaire des relances Passeport, une question à la fois, déclenchées par les trous réels du dossier (pas de questionnaire). Ex. : rapport d'inspection manquant → puis rénovations depuis l'inspection. Alex propose l'ajout, ne le fait pas à la place du propriétaire.

## 10. Connexion au reste d'UNPRO

Après analyse de soumission, projet réalisé, inspection ou réparation documentée via UNPRO : proposer « Ajouter ce projet à mon Passeport Maison » avec consentement explicite, créant un `property_events` provenance `verified` quand une pièce existe.

## 11. Analytics

Via `eventTrackingService` existant, catégorie `passport` : `passeport_created`, `inspection_uploaded`, `renovation_added`, `repair_added`, `warranty_added`, `maintenance_completed`, `passport_report_generated`, `passport_shared`. Aucun second système.

## 12. Automatisations (préparation)

Poser les crochets sans envoyer de notifications à ce stade : expiration de garantie, entretien périodique, suivi de recommandation d'inspection, document manquant, confirmation de travaux. Rien qui puisse générer du spam.

## 13. Design

Conserver l'identité premium actuelle : glass, profondeur, cartes premium, microanimations discrètes, rendu impeccable en light et dark. Aucun nouveau langage visuel.

## Tests

Parcours réel sur une propriété de test : création → inspection uploadée → extraction → confirmation → timeline → rénovation → garantie → suggestion d'entretien → génération du dossier. Vérifié sur desktop, Android, iPhone, FR/EN, light/dark, compte vide, compte riche, erreur d'upload, document non reconnu, données partielles.

## Critères de fin

- Un propriétaire comprend en moins de 10 secondes la valeur (mémoire, prévention, preuve).
- La timeline affiche uniquement des données réelles avec provenance visible.
- Un upload produit un événement confirmé par l'utilisateur.
- Le dossier se génère et distingue vérifié / déclaré / inféré.
- Aucune promesse de valeur marchande, de taxes ou de financement nulle part.
