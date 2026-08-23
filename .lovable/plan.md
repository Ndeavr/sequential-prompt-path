# Profil de compatibilité Excavation — Phase 3 (fermeture des critères manquants)

Le questionnaire existe déjà en production et est branché à la fiche entrepreneur réelle : `/pro/compatibilite` (6 étapes conditionnelles, autosave, reprise, écran « Voici comment UNPRO comprend votre entreprise » avec Modifier / C'est exact), tables `contractor_compatibility_profiles`, `contractor_service_preferences`, `contractor_territory_preferences`, `contractor_prequalification_requirements`, `contractor_capacity_state`, `contractor_matching_rules`, `contractor_compatibility_insights`, edge functions `contractor-compatibility-save / -finalize / -infer`, consommation par `match-lead` et par la préqualification d'Alex, panneau admin sur la fiche entrepreneur.

Cette phase ferme les points du cahier de charges qui ne sont pas encore réalisés.

## 1. Admin : édition réelle + journal d'audit (section 15 + 19)

Aujourd'hui le panneau admin `Compatibilité & projets recherchés` est en lecture seule (un seul bouton « ouvrir le questionnaire ») et seuls deux évènements génériques sont journalisés.

- Rendre le panneau éditable en ligne : posture de service (Prioritaire / Accepté / Non recherché), palier de territoire et minimum de zone, plancher de projet, capacité et pause d'agenda, niveau de préqualification, promotion/rejet d'une préférence déduite.
- Chaque écriture passe par l'edge function existante (jamais d'écriture directe depuis le navigateur), avec validation serveur de la propriété de la fiche.
- Journaliser des évènements granulaires dans l'infrastructure d'audit existante (`admin_action_logs`) : `contractor_profile_preferences_updated`, `service_priority_changed`, `territory_preference_changed`, `hard_exclusion_added`, `capacity_changed`, `prequalification_changed`, `questionnaire_completed` — avec acteur, entrepreneur, horodatage, valeur avant/après.
- Afficher dans le panneau les 10 dernières modifications avec l'auteur.

## 2. Séparation publique / privée / déduite (section 13)

- Exposer publiquement uniquement les services déclarés (prioritaires + acceptés) et les territoires desservis, via une vue en lecture publique dédiée.
- Ne jamais exposer : planchers de projet, minimums par zone, types de clients refusés, capacité, notes internes, exigences de préqualification, préférences déduites.
- Vérifier par requête réelle qu'un visiteur non authentifié ne peut lire aucune table de préférences privées.

## 3. Boucle d'apprentissage sur résultats réels (section 16)

- Créer une table de résultats reliant recommandation → rendez-vous proposé → accepté → complété → soumission → gagné/perdu → valeur de contrat, alimentée uniquement par les évènements de production existants (aucune donnée inventée).
- Créer une vue de comparaison entre préférences déclarées et résultats observés.
- Générer des propositions d'ajustement dans `contractor_compatibility_insights` marquées `inferred`, affichées à l'entrepreneur sous la forme « UNPRO a détecté une opportunité » avec confirmation explicite. Aucune préférence modifiée automatiquement.
- Respecter l'interrupteur `learning_opt_in` déjà présent à l'étape 6.

## 4. Vérification bout en bout en production (section 20)

- Choisir une vraie fiche entrepreneur excavation/fondation en production.
- Parcours : fiche → questionnaire → autosave → rafraîchissement à mi-parcours → reprise à la bonne étape → questions conditionnelles (« Ça dépend », minimum par territoire, pause d'agenda) → résumé → retour à la fiche → réponses persistées.
- Vérifier côté admin : lecture, édition, audit.
- Vérifier l'étanchéité : entrepreneur A ne peut pas lire les préférences de l'entrepreneur B ; les données privées ne sortent pas sur le profil public.
- Vérifier que `match-lead` applique les règles et qu'Alex récupère les exigences de préqualification.
- Vérifier en format mobile.

## Détails techniques

- Nouvelle table `contractor_recommendation_outcomes` (contractor_id, lead/appointment refs, stage, valeur, horodatages) + vue `v_contractor_preference_vs_outcome`, RLS admin + entrepreneur propriétaire, GRANT explicites.
- Nouvelle vue publique `v_contractor_public_services` en SECURITY INVOKER, colonnes strictement déclaratives.
- Extension de `contractor-compatibility-save` avec un mode `admin_patch` (validation `has_role(admin)`), écriture d'audit systématique.
- Aucune nouvelle table entrepreneur, service, territoire ou questionnaire : uniquement extension de l'architecture existante.
- Aucun appel externe payant, aucun envoi de messages sortants.
