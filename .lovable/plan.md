# Débloquer le volume SMS par provenance vérifiée

## Objectif
Étendre le pipeline existant afin que les prospects Facebook intacts puissent obtenir gratuitement une provenance publique vérifiable, puis repasser par le gate SMS central sans contourner les règles de conformité ni créer un second système.

## Construction
1. Ajouter un enrichisseur de provenance ciblé aux prospects Facebook sans historique de contact. Réutiliser les sources et preuves déjà stockées, les sites officiels et les registres publics gratuits; refuser toute correspondance ambiguë.
2. Persister sur le prospect la provenance confirmée (URL, type, source, méthode, horodatage, statut) dans la structure existante et journaliser chaque tentative et transition dans les journaux d’acquisition.
3. Appliquer avant validation les protections existantes : historique SMS/contact, doublons téléphone/entreprise, suppression/opt-out, admissibilité téléphone, qualité et conformité.
4. Alimenter uniquement le worker SMS canonique après validation. Conserver les deux prospects ayant déjà un historique SMS hors file, sans envoi automatique en double.
5. Créer `/admin/acquisition/provenance` avec quatre états opérationnels : Validé / Prêt SMS, Enrichissement requis, Rejeté, Déjà contacté. Afficher les preuves, blocages, dernier contact, prochaine action et lien public ouvrable.
6. Exécuter le flux sur les vrais prospects Facebook actuels, tester en mode préparation puis envoyer uniquement le plus petit lot réellement admissible à travers le worker existant.

## Données et sécurité
- Réutiliser `verified_contractor_prospects`, `contractor_prospects`, `acquisition_pipeline_logs`, `acq_sms_logs`, les suppressions et tokens existants.
- Ajouter une table de tentatives seulement si aucun journal existant ne peut porter proprement les preuves structurées; appliquer GRANT, RLS et accès admin/service.
- Ne jamais inventer une URL, une identité, un consentement ou une preuve.
- Ne jamais appeler Google Places, DataForSEO ou une autre API payante.

## Validation
- Prouver les nombres examinés, enrichis, manquants, admissibles, mis en file, rejetés et contactés.
- Vérifier que chaque URL résout la bonne entreprise et que chaque token conserve l’attribution.
- Vérifier qu’aucun prospect déjà contacté n’est remis en file et qu’aucun appel payant n’apparaît dans les journaux.
- Vérifier le build, le rendu admin mobile/desktop et les résultats du worker central.
