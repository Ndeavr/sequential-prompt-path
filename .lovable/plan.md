# Correctifs P0/P1 — conversion et observabilité UNPRO

Six régressions. Cinq causes racines sont déjà confirmées par lecture directe de la base et du code. Aucun nouveau système : réparation de l'existant.

---

## P0 — Journalisation des événements de prospection

**Cause racine confirmée.** La table d'événements du tunnel (`contractor_funnel_events`) possède bien une politique d'écriture « tout le monde peut insérer », mais **aucun droit n'a jamais été accordé** aux rôles applicatifs. Vérifié : la requête des droits sur cette table renvoie zéro ligne pour les trois rôles. Résultat : chaque écriture est rejetée au niveau du moteur avant même d'atteindre la politique. Même constat pour les deux fonctions d'enregistrement SMS/courriel : seul le rôle serveur peut les exécuter, ce qui est correct, mais aucun droit de lecture n'existe pour l'affichage.

Correctifs :
- Migration accordant les droits manquants, alignés exactement sur les politiques déjà écrites (écriture des événements, lecture réservée à l'admin et au propriétaire).
- Clé d'idempotence sur les événements provenant des fournisseurs (SMS, courriel, redirections) pour qu'un renvoi ou un rejeu ne crée jamais de doublon.
- Fin du silence : une écriture refusée est enregistrée dans le mécanisme d'erreur existant et remonte un état de reprise, au lieu d'être avalée par le `catch` actuel.
- Vérification par événements de test marqués comme tels, exclus des vues de production. Aucun envoi réel.

## P0 — Recherche d'entreprise du devis personnalisé

**Cause racine confirmée.** Dans l'étape « Quelle est votre entreprise? », le bouton « Continuer avec une entreprise non trouvée » n'apparaît que lorsque la recherche renvoie exactement zéro résultat. Dès qu'un résultat approchant remonte, l'entrepreneur dont l'entreprise n'est pas listée se retrouve sans issue.

Correctifs :
- L'option « Mon entreprise n'est pas listée » s'affiche dès qu'une recherche a été effectuée, avec ou sans résultats.
- Le chemin manuel crée ou réutilise la fiche déclarée existante, sans jamais inventer de données, et conserve la distinction Vérifié / Déclaré / Inféré.
- La recherche et la sélection existantes restent inchangées.

## P0 — Admissibilité à l'offre gratuite

**Cause racine confirmée.** L'exclusion des métiers de rénovation est appliquée **sur le texte brut avant** toute reconnaissance de catégorie. Les marqueurs « plancher », « cuisine », « sous sol », « ceramique » font donc rejeter des entreprises de nettoyage parfaitement admissibles : « nettoyage de planchers et céramique », « nettoyage de cuisine », « basement cleanout » sont tous exclus à tort aujourd'hui.

Correctif :
- Inverser l'ordre : d'abord déterminer la catégorie réellement déclarée ou sélectionnée ; n'appliquer l'exclusion rénovation que si aucune catégorie de service local n'a été reconnue.
- Tests de régression français et anglais sur les libellés ambigus ci-dessus, plus les métiers de rénovation qui doivent rester exclus.
- La découverte de prospects appelle la même fonction unique (le miroir client et le module serveur restent identiques).

## P1 — Fiches publiques d'entrepreneurs

**Cause racine confirmée.** La fonction `aipp_is_published` est utilisée par les politiques de lecture publique de neuf tables, mais son droit d'exécution n'a jamais été accordé aux visiteurs anonymes ni connectés (vérifié : exécution autorisée pour le rôle serveur uniquement). D'où l'erreur « permission denied for function ». Les tables elles-mêmes n'ont non plus aucun droit accordé.

Correctifs :
- Migration accordant l'exécution de la fonction et la lecture des tables strictement aux champs publics déjà prévus par les politiques : en-tête d'entreprise, services, localisations, médias approuvés, avis et sources publics, scores publics.
- Aucun élargissement : brouillons, données de risque, contacts, facturation, notes et journaux d'audit restent inaccessibles.
- La fonction garde son `search_path` verrouillé.
- Vérification en visiteur anonyme sur une fiche réellement publiée, plus rendu robot.

## P1 — Affichage et paiement annuel

Le catalogue de forfaits devient la seule référence pour l'affichage annuel.

- Sans prix annuel valide et positif, l'option annuelle est masquée et aucune session de paiement annuelle ne peut être créée.
- Avec prix annuel, le même montant calculé et la même devise s'affichent sur la page publique, la sélection, le paiement et la confirmation.
- Un forfait payant ne peut jamais partir à zéro dollar ; seul le forfait gratuit explicite mène à l'activation sans paiement.
- Mode test uniquement, aucune modification du mode réel.

## P1 — Enregistrement du calculateur de rénovation

- Valider la superficie saisie contre le type de rénovation choisi **avant** de calculer, pour ne jamais afficher un prix impossible à enregistrer.
- Message au niveau du champ, en français et en anglais, indiquant la plage permise.
- Les réponses déjà saisies sont conservées pendant la correction.
- L'erreur technique exacte part vers la surveillance ; le propriétaire voit un message de reprise humain.

## P1 — Appels CRM et affiliés

**Cause racine confirmée, et ce n'est pas l'interface.** L'appel n'est permis qu'avec un statut de validation positif (`valid_mobile` ou `valid_sms_capable_voip`). Or en production, **aucun dossier ne porte un de ces statuts** : 153 `invalid_phone`, 78 `lookup_failed`, 61 `pending_validation`, 10 `outside_quebec`. Le bouton est donc désactivé partout parce que la validation téléphonique n'a jamais abouti, pas parce que la règle est trop stricte.

Correctifs :
- Réparer la chaîne de validation pour que les 78 échecs de recherche et les 61 dossiers en attente soient réellement traités et reçoivent un statut définitif.
- Afficher sur chaque dossier bloqué la raison exacte : numéro absent ou invalide, validation non aboutie, retrait demandé, restriction de consentement, ou indisponible.
- Activer l'appel uniquement pour les dossiers valides, admissibles et conformes. Aucune règle de conformité assouplie, chaque appel reste audité.
- Honnêtement : tant que la validation ne renvoie pas de statut positif pour au moins un dossier réel, je ne pourrai pas prouver un bouton d'appel actif ; je rapporterai alors le compte exact par statut plutôt que d'annoncer un succès.

---

## Détails techniques

- Migrations : droits sur `contractor_funnel_events` ; exécution de `public.aipp_is_published` pour `anon`/`authenticated` ; lecture des neuf tables `aipp_*` publiques ; index d'idempotence sur les événements fournisseurs. Aucune politique existante affaiblie.
- Fichiers principaux : `src/lib/analytics/logFunnelEvent.ts`, `supabase/functions/_shared/outreachEvents.ts`, `supabase/functions/_shared/localServiceCategories.ts` + miroir `src/lib/localServices/categories.ts`, `src/pages/contractor-funnel/PageContractorPricingIntake.tsx`, `src/pages/calculators/PageRenovationEstimator.tsx`, `src/pages/affiliate/PageAffiliateActionMode.tsx`, `src/components/crm/ManualContactPanel.tsx`, catalogue de forfaits et écrans de paiement.
- Tests ajoutés ou réparés pour chacune des six régressions, puis vérification des types, des tests et de la construction.
- Aucune publication, aucun envoi SMS/courriel/appel réel, aucune clé ni configuration d'envoi de production modifiée.

## Limites assumées

- Les parcours de paiement restent limités au mode test ; aucune preuve de paiement réel ne sera produite.
- La preuve de bout en bout pour l'appel dépend d'au moins un numéro réellement validé (voir ci-dessus).
