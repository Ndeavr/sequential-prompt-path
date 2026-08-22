# Profil de compatibilité — Excavation / Fondations / Drainage

Questionnaire intelligent, conditionnel, mobile-first (5–8 min), toujours rattaché à une fiche entrepreneur existante. Aucune nouvelle architecture entrepreneur : on étend celle en production.

## État actuel vérifié (lectures faites avant ce plan)

- `contractors` existe (147 colonnes) avec `compatibility jsonb`, `service_areas`, `services_structured`, `travel_radius_km`, `is_accepting_appointments`.
- Tables déjà en place et réutilisables : `contractor_services`, `contractor_service_areas` (27 lignes), `contractor_capabilities` (0 ligne, schéma capability_type/category_slug/service_slug/material_slug/structure_type/confidence/source), `contractor_exclusions` (0 ligne, même forme + reason_fr), `contractor_capacity_state`, `contractor_objectives`, `contractor_specialties`, `contractor_dna_profiles`, `contractor_profile_completion`.
- Un questionnaire générique existe déjà : `src/hooks/useContractorQuestionnaire.ts` (identité/activité/services/zones/preuve/réputation/conversion) — il écrit dans `contractors` + `contractor_services` + `contractor_service_areas`. Le nouveau module s'y branche, ne le remplace pas.
- Matching en production : `supabase/functions/match-lead/index.ts` (villes + catégories + AIPP + note + vérification). Il ne consomme aujourd'hui ni `contractor_capabilities` ni `contractor_exclusions`.
- Qualification Alex : `src/lib/alexQualification/*` (score ≥ 70, arbres par métier, `serviceSpecialtyValidator`).
- Audit : `admin_action_logs` (actor_user_id, contractor_id, action_type, notes, payload_json) + `system_audit_logs`.
- Fiches admin/pro existantes : `src/pages/admin/AdminContractorDetail.tsx`, `src/pages/pro/ProProfile.tsx`, `ProTerritories.tsx`, `ProExpertise.tsx`.
- Fait important : aucune fiche `contractors` avec spécialité/nom excavation-fondation-drain-fissure n'existe aujourd'hui (requête = 0 ligne). Le test bout-en-bout se fera donc sur une fiche entrepreneur réelle créée via le flux admin existant (`PageAdminCreateContractorManual`) à partir d'un prospect vérifié réel, sans inventer de données de performance.

## Ce qui sera construit

### 1. Schéma (extension, pas duplication)

Nouvelles tables (UUID, created_at/updated_at, index, GRANT + RLS + policies, audit) :

- `contractor_compatibility_profiles` — 1 ligne par entrepreneur : `trade_pack` ('excavation_fondation'), `status` (draft/completed), `completion_pct`, `current_step`, `answers jsonb` (autosave brut), `summary jsonb`, `completed_at`, `last_updated_by`.
- `contractor_service_preferences` — par service : `service_slug`, `stance` (priority/accepted/not_wanted), `min_project_cents`.
- `contractor_project_preferences` — par condition de projet (infiltration active, sous-sol fini, fondation pierre, contraintes d'accès…) : `dimension`, `key`, `answer` (yes/no/depends), `condition_note`, `confidence`, `source` (declared/admin/inferred).
- `contractor_territory_preferences` — rattaché à `contractor_service_areas` quand la zone existe déjà : `area_id` (nullable), `city_slug`, `tier` (priority/normal/large_only/blocked), `min_project_cents`.
- `contractor_prequalification_requirements` — `criterion` (photos, adresse, budget, type de fondation, inspection caméra…), `level` (optional/important/required).
- `contractor_matching_rules` — vue matérialisée par écriture : `rule_type` (hard_exclusion / soft_preference / priority / capacity / prequalification / inferred), `payload jsonb`, `is_active`, `confirmed_by_contractor`, `source`.
- `contractor_compatibility_insights` — pour le module 16 : écarts détectés entre préférences déclarées et résultats réels (aucune valeur inventée, alimenté uniquement par les tables de rendez-vous/outcomes existantes), avec `status` (suggested/accepted/dismissed).

Réutilisé sans duplication : capacité → `contractor_capacity_state` (+ `is_accepting_appointments` pour « Mon agenda est plein »), territoires → `contractor_service_areas`, services → `contractor_services`, exclusions dures confirmées → `contractor_exclusions`, capacités confirmées → `contractor_capabilities`, texte libre IA → `contractor_dna_profiles` (source `inferred`).

RLS : entrepreneur = `contractor_id in (select id from contractors where user_id = auth.uid())`, admin via `has_role(auth.uid(),'admin')`, aucun accès `anon`. Le `contractor_id` n'est jamais accepté depuis le frontend seul : la fonction edge le résout et le valide.

### 2. Edge functions

- `contractor-compatibility-save` — autosave par étape, résolution/validation serveur du `contractor_id`, écriture des tables normalisées + `admin_action_logs`.
- `contractor-compatibility-finalize` — calcule `completion_pct`, génère le résumé, matérialise `contractor_matching_rules`, propage les exclusions confirmées vers `contractor_exclusions`.
- `contractor-compatibility-infer` — via Lovable AI (Gemini) : dérive des préférences candidates depuis les réponses libres, toujours écrites avec `source='inferred'` et `confirmed_by_contractor=false`. Jamais d'exclusion dure automatique.

### 3. Parcours entrepreneur (mobile-first)

Route `/pro/compatibilite` (et `/admin/contractors/:id/compatibilite` pour l'admin), 6 étapes avec barre de progression, une question principale par écran, chips/toggles/cartes, autosave debounce, « Sauvegarder et continuer plus tard », reprise exacte à l'étape stockée :

1. Services (multi-select + PRIORITAIRE / ACCEPTÉ / NON RECHERCHÉ ; les services non recherchés ne déclenchent aucune sous-question)
2. Types de projets + fondations + accès/équipement/contraintes (OUI / NON / ÇA DÉPEND avec champ conditionnel « Dans quelles conditions ? »)
3. Argent simple (montant plancher, contrat idéal, préférence volume vs valeur, minimums par service en réglages avancés)
4. Territoire (villes existantes du profil d'abord, puis ajout ; tier par zone + minimum si « seulement gros projets »)
5. Capacité et délais (+ urgences, 24–48 h, fin de semaine, hiver, « Mon agenda est plein » → pause via `contractor_capacity_state`, sans dépublier le profil)
6. Préqualification + 3 questions critiques + section apprentissage IA

Puis écran « Voici comment UNPRO comprend votre entreprise » (services prioritaires, projet idéal, territoires, ACCEPTE / À ÉVALUER / REFUSE, capacité, préqualification) avec « Modifier » et « C'est exact ».

Point d'entrée sur la fiche pro et le dashboard : carte « Améliorer mes recommandations » + « Profil de compatibilité : X % » + CTA.

### 4. Fiche admin

Onglet « Compatibilité & projets recherchés » dans `AdminContractorDetail.tsx` : complétion, dernière mise à jour, services, préférences, minimums, territoires, capacité, contraintes d'accès, préqualification, exclusions dures, préférences souples, préférences inférées (badge INFERRED). Édition admin possible, chaque modification écrite dans `admin_action_logs`.

### 5. Matching et Alex

- `match-lead` étendu : après le filtrage villes/catégories actuel, application des exclusions dures confirmées, du tier de territoire, des minimums de budget, des contraintes d'accès, de la capacité, puis bonus de priorité. Les règles `inferred` n'excluent jamais — elles ne font que moduler le classement.
- Alex : `src/lib/alexQualification/nextQuestionSelector.ts` lit les exigences de préqualification des entrepreneurs candidats et ajoute les questions manquantes (photos, adresse, type de fondation, inspection caméra…) avant de proposer un rendez-vous.

### 6. Séparation des données

`PUBLIC` (services déclarés, territoires) exposé via les vues profil publiques existantes ; `PRIVATE` (minimums, refus, capacité, notes, stratégie) réservé entrepreneur+admin ; `INFERRED` visible uniquement en interne avec badge, jamais publié.

### 7. Audit et événements

`contractor_profile_preferences_updated`, `service_priority_changed`, `territory_preference_changed`, `hard_exclusion_added`, `capacity_changed`, `prequalification_changed`, `questionnaire_completed` → `admin_action_logs` (+ `system_audit_logs` pour les actions système).

### 8. Tests bout-en-bout

Sur une fiche entrepreneur réelle : complétion, autosave, questions conditionnelles, résumé, retour sur fiche, admin, non-exposition publique du privé, consommation par le matching, accès Alex aux exigences. Plus : mobile, rafraîchissement à mi-parcours, déconnexion/reconnexion, entrepreneur A ne peut pas lire B, « Ça dépend », minimum par territoire, pause de capacité, réédition.

## Livraison

Phase 1 : schéma + RLS + edge functions + parcours 6 étapes + résumé + entrée sur fiche pro.
Phase 2 : onglet admin + audit + branchement matching + Alex.
Phase 3 : boucle d'apprentissage (insights à confirmer, aucune modification automatique des préférences).
