# Réconciliation des envois du 6 nov 2026

Mise à jour vérifiée le 7 nov 2026, `checked_at = 2026-11-07T03:15:36Z`. Périmètre : les 24 demandes déjà enregistrées le 6 nov, sans nouvel envoi, paiement, déploiement ou modification des contrôles. Ce document public contient uniquement des agrégats ; les identifiants et dossiers individuels restent dans les systèmes privés existants.

## Résultat fournisseur — Gmail, pas Resend

- 24 demandes, 24 identifiants fournisseur distincts, 24 destinataires normalisés distincts, deux campagnes.
- Les **24 identifiants correspondent exactement à des messages du dossier Gmail SENT**, vérifiés par `GET /gmail/v1/users/me/messages` (HTTP 200, connexion existante « Teenth's Gmail », filtre 6 nov). Le fournisseur retourne 26 messages dans cette fenêtre ; les deux hors périmètre ne sont pas inclus dans ces totaux.
- **24 envoyés/acceptés par Gmail ; 1 rebond permanent confirmé ; 23 livraisons inconnues.** SENT prouve l'envoi côté Gmail, pas l'acceptation par le serveur destinataire ni la livraison en boîte de réception. « Envoyé » et « rebondi » sont des étapes successives, pas des compteurs à additionner.
- La notification liée au message déjà `failed_final` est dans le même fil : adresse introuvable, erreur SMTP 550. `GET /threads/{id}` et `GET /messages/{notification_id}` : HTTP 200 ; `Content-Type: multipart/report; report-type=delivery-status` ; **horodatage fournisseur `2026-11-06T12:39:18Z`** (`internalDate` et en-tête Date concordants). L'horodatage d'enregistrement des suppressions, plus tardif, n'est pas l'heure du rebond.
- Recherche bornée des notifications mailer-daemon/postmaster depuis le 6 nov : une notification, correspondant à ce rebond connu. L'absence d'autre notification ne prouve pas la livraison des 23 autres.
- Lecture Resend initiale : HTTP 401 `restricted_api_key`, « This API key is restricted to only send emails ». Ce n'est ni une clé invalide ni le blocage réel de cette réconciliation : les identifiants de ces envois appartiennent à Gmail. Aucune reconnexion, rotation ou répétition de cette requête.

## Dénominateur et déduplication

- Statuts internes inchangés : **23 `sent` + 1 `failed_final` = 24**.
- Preuves : **16 avec ligne machine + 7 sans ligne parmi les 23 `sent` + 1 sans ligne pour le destinataire en rebond = 24**. Le précédent « 16 + 7 » omettait la ligne échouée ; le rebond n'est pas une catégorie de consentement.
- Entreprises : 16 identifiants distincts `outbound_company_id` dans les preuves ; 8 libellés d'entreprise supplémentaires dans les métadonnées des envois. Jointure des noms puis normalisation espaces/casse : **24 libellés distincts, aucun manquant**. Aucune duplication visible par identifiant ancré ou libellé normalisé ; les 8 entreprises sans ancrage ne constituent pas une identité juridique vérifiée. Les 19 domaines destinataires distincts ne sont pas un compteur d'entreprises.
- Aucun des 24 événements n'a de `prospect_id` ou `contractor_id` ; aucune correspondance par email exact dans `contractor_prospects`. Ne pas créer ou attribuer une identité pour combler cela.

## Complétude des preuves — aucune approbation humaine inventée

- 16 lignes `auto_captured`, `is_valid`, `reviewer_id IS NULL`, méthode `automated_public_website_review`, base `implicit_public_conspicuous`.
- 16/16 : URL HTTPS, date de récupération et explication de pertinence présentes ; aucun refus signalé, aucune invalidation, aucune expiration constatée.
- **0/16 empreinte de page, 0/16 capture d'écran**. Ces absences limitent la traçabilité ; elles ne sont pas présentées comme des exigences nouvelles du gate.
- Type de source enregistré : `official_business_website`, et non `company_website`. L'observation machine n'est ni une révision humaine ni une validation indépendante du contenu du site pendant cette session.
- **0/24 signature humaine.** Aucune politique de campagne correspondante et aucune décision machine `auto_validated` non expirée trouvées pour ces deux campagnes.

### Source exacte des exigences existantes

- `outreach-resend-send/index.ts:66–69` appelle **`public.casl_send_basis`**. Sa définition actuellement en base accepte une base humaine valide OU une décision machine `auto_validated` fraîche, liée à une politique `active AND offer_operational`, avec contrôles de suppression. Le commentaire du handler parlant uniquement de revue humaine ne décrit donc pas toutes les branches de la fonction SQL actuelle.
- Pour ces deux campagnes, la branche machine ne dispose d'aucune politique/décision correspondante ; aucune base humaine n'est présente. Cela ne constitue pas un résultat d'exécution de la RPC ni une autorisation d'envoi. Le switch et la porte restent fermés indépendamment.
- **`public.casl_evidence_human_review_guard`** : signature par un administrateur authentifié comme lui-même, notes ≥30 caractères ; pour `implicit_public_conspicuous`, source exactement `company_website`, HTTPS et absence de refus. Une identité de réviseur existante est immuable. Rien de ces règles n'a été modifié.

### Seuls dossiers nécessitant une décision ou vérification humaine

1. Les 16 dossiers machine : confirmer la publication, la pertinence et la provenance avant toute signature ; résoudre le type de source non concordant sans le renommer automatiquement. L'agent ne signe pas.
2. Les 7 destinataires non échoués sans preuve : déterminer une base documentée dans le dossier existant ou maintenir l'absence de contact. Aucune suppression arbitraire n'est ajoutée.
3. Aucun arbitrage requis pour le rebond permanent : conserver le destinataire exclu et les deux protections déjà enregistrées (`outbound_suppressions`, `outreach_suppressions`). Elles représentent le même destinataire, pas deux rebonds.

## Journaux : aucune écriture distante

- `outreach_email_events` : 24 lignes existantes, dont 1 avec `bounced_at` ; 0 `delivered_at`, 0 `opened_at`, 0 `clicked_at`, 0 `replied_at` renseignés pour ce lot.
- `outreach_delivery_logs` : 0 ligne ; `outreach_delivery_events` : 0 ligne ; `pipeline_engagement_events` : aucune ligne pour ces 24 identifiants.
- **Ces absences sont des lacunes de suivi, pas zéro ouverture/clic/réponse réelle.** Les interactions et livraisons réelles restent inconnues hors du rebond prouvé. Les ventes et le site n'ont pas été revérifiés dans ce périmètre.
- **Lignes insérées/modifiées : 0/0.** Pas de chemin existant vérifié qui réconcilie Gmail vers ces journaux avec conservation de l'horodatage source et idempotence : les deux tables de livraison n'ont d'unicité que sur leur UUID interne, aucune sur l'identifiant fournisseur ; les chemins examinés sont des insertions simples ou des webhooks, pas une ingestion authentifiée de cette lecture Gmail. Ne pas fabriquer ou rejouer un callback fournisseur.
- Le journal d'audit générique `record_engagement_event` possède une clé d'idempotence, mais ne remplit pas ces tables de livraison. Il n'a pas été invoqué comme substitut. La réconciliation est donc préparée et documentée seulement, conformément à la condition d'un chemin supporté sans déploiement.
- Contrat préparé pour un chemin autorisé existant à identifier : identifiant fournisseur déjà enregistré, source `gmail_api`, statut observé et portée de preuve, horodatage fournisseur réel si disponible, `checked_at`, clé stable fournisseur/message/type d'événement ; ne jamais remplacer une date de livraison inconnue par la date de vérification. Aucun payload nominatif n'est ajouté au dépôt public.

## Contrôles inchangés et blocage restant

- Lecture finale : `system_flags.OUTREACH_ENABLED = false`.
- `outreach_autopilot_gate` : `gated = true`, score 70, raisons `no_recent_e2e_pass,operational_score_below_95`, dernier pass `2026-10-21T15:14:10.699831Z`, ligne actualisée à `2026-11-07T03:15:00.402164Z` par le système, pas par cette session.
- `supabase/functions/_shared/autopilotGate.ts` requiert `!gated` et un pass de moins de 24 h. Le QA existant conserve `signed_test_payment_unverified` dans `acq-e2e-real/assertions.ts` : connectivité Checkout ≠ paiement TEST complété/webhook signé. Aucune exécution QA ni modification de seuil.
- **Blocage précis : Gmail ne fournit pas de preuve positive de livraison via SENT ; aucune voie de persistance Gmail idempotente et horodatée n'est vérifiée dans les chemins existants examinés.** Le prochain travail nécessite identifier une telle voie déjà supportée ou autoriser séparément sa correction ; aucune correction serveur n'est déployée ici.
