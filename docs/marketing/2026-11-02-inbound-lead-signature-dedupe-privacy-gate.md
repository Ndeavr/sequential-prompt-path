# UNPRO — Inbound opt-in / lead form: ingestion de confiance (préparation, 2026-11-02)

**État : document de conception / contrôle, NON implémenté, NON déployé.**
**Base revalidée :** `lovable-sync` @ `2d058b663beb3db61c2c66f852bbe51b6086c43b` (2026-11-03, PR #173 fusionnée ; aucun déploiement vérifié).
**Priorité :** après la validation E2E du paiement 350 $ / webhook signé / droit de présence 12 mois ([P0 #86](https://github.com/Ndeavr/sequential-prompt-path/issues/86)).
**Objectif :** préparer des demandes entrantes *volontaires* via pages UNPRO ou, seulement après approbation, formulaires partenaires/publicitaires. Aucun nouveau prestataire, campagne, envoi ni budget n'est autorisé par ce document.

## 1. Inventaire réel : réutiliser, ne pas détourner

- `supabase/functions/submit-sales-team-request/index.ts` → table `sales_team_requests`. Validation Zod, clé d'idempotence 16–64 caractères, honeypot, limite par IP hachée, `follow_up_consent: true`, texte de consentement, case `marketing_opt_in` distincte et optionnelle; aucun SMS/email sortant dans cette fonction. **Cette clé fournie par le navigateur ne prouve PAS qu'un webhook externe est authentique**; le formulaire utilisateur reste distinct de l'ingestion fournisseur.
- `supabase/functions/visibilite-ia-lead/index.ts` → table `leads`, `lead_type = contractor`, dédoublonnage application sur téléphone + source / 24 h et notification interne Resend. Cet endpoint est public, ne vérifie pas de signature fournisseur et inscrit un texte générique de consentement lié à la demande ponctuelle. Depuis [PR #173](https://github.com/Ndeavr/sequential-prompt-path/pull/173), son code ne persiste plus l'IP brute ni le `User-Agent` dans le `payload` CRM (test synthétique, déploiement non vérifié). **Ne pas le connecter directement à un export de leads publicitaires ni y déduire un opt-in marketing.** Son contrôle anti-doublon `SELECT` puis `INSERT` n'est pas une garantie transactionnelle sous concurrence.
- `supabase/functions/process-form-submission/index.ts` peut déclencher des emails sur un `submission_id`; **ne pas l'invoquer depuis une nouvelle ingestion** (aucun message, même transactionnel, sans qualification et garde-fous spécifiques).
- `contractor_funnel_events` et `logFunnelEvent` sont les voies d'analytics existantes : `source` / `event_source` = origine technique et **non** canal commercial.
- L'attribution revendiquée (`utm_*`, `ref`, `affiliate_code`) et la permission de contacter sont des concepts différents. Ni un identifiant CRM ni un `PAID` historique ne devient preuve Stripe.

## 2. Contrat d'ingestion envisagé (aucun endpoint nouveau encore)

1. **Entrée volontaire** : privilégier `/entrepreneurs/audit-ia` et les formulaires UNPRO existants, avec lien menant à l'analyse demandée. Afficher deux permissions indépendantes : (a) recontact *uniquement pour la demande précise*; (b) marketing futur, case **décochée** par défaut. L'absence de (b) n'interdit pas la réponse strictement demandée, mais bloque l'inscription aux séquences.
2. **Entrée partenaire/formulaire publicitaire seulement si autorisée** : ne pas accepter un POST anonyme comme « lead vérifié ». Authentifier la source *avant parsing utile, écriture ou notification* : signature cryptographique sur corps brut si effectivement prise en charge; vérifier délai/rejeu et secret serveur, à temps constant. Si le fournisseur n'offre pas de signature suffisante, récupérer et vérifier côté serveur l'identifiant et le contenu auprès de son API authentifiée déjà autorisée; un simple champ `source`, `token`, `google_key`, UTM ou clé fournie par le navigateur **n'est pas une signature**. Si ce contrôle est indisponible, échec fermé, zéro insertion, zéro contact.
3. **Identité et dédoublonnage** : utiliser pour l'idempotence transport `provider + account_id + provider_lead_id` (ou une clé serveur équivalente pour formulaire maison), avec unicité **atomique en DB**, non `SELECT` puis `INSERT` seul. Normaliser téléphone E.164 et courriel; distinguer tentative rejouée, même établissement et entreprise légale possiblement distincte. Collision entre propriétaires/NEQ/téléphone = revue humaine; ne jamais fusionner deux comptes sur téléphone seul ni exposer un token à l'autre.
4. **Persisté dans le CRM existant, pas un nouveau CRM** : stocker uniquement données utiles, source vérifiée et identifiant fournisseur pseudonymisé/limité, horodatage, version/texte des deux permissions, langue, objet de la demande, pays, métriques d'attribution déclarées et état `awaiting_human_CASL_review`. Ne créer un `onboarding_token` qu'après contrôle de propriété et d'expiration. Ne jamais écrire `reviewer_id`, `consent_signed`, `PAID`, `ACTIVATED` ou éligibilité RBQ à partir d'un webhook.
5. **Confidentialité et retenue** : ne journaliser ni téléphone/courriel ni corps de webhook ni IP brute. Masquer les secrets, limiter l'accès service-role, prévoir suppression/rétention selon politique approuvée et demandes de retrait; isoler les événements TEST et les acteurs internes; ne pas déclencher d'email/SMS automatique. Vérifier STOP et base légale CASL pour tout contact futur, même si la demande a été reçue par un partenaire.
6. **Attribution** : au départ enregistrer `channel=unattributed` si aucune preuve. Déclarer le canal *affiliate_partner / organic / authorized_paid / compliant_outreach* seulement quand origine vérifiée; conserver UTM déclaré séparément. `Direct` dans Lovable ≠ trafic professionnel qualifié. Suivre unités distinctes par variante et trois univers : visiteurs uniques qualifiés, analyses, inscriptions, checkouts, règlements Stripe LIVE 350 $ et droits confirmés; CAC uniquement si dépense/commission vérifiée.

## 3. Tests d'acceptation isolés avant toute implémentation/release

- HMAC correct vs invalide / manquant; corps altéré après signature; rejeu et fenêtre de temps; fournisseur ou compte étranger; absence de secret : **aucune écriture, aucun email/SMS**.
- Si une vérification fournisseur par API est requise : ID absent, ID d'un autre compte, API indisponible ou réponse incohérente = quarantaine/échec fermé, aucune attribution « validée ».
- Double livraison simultanée du même `provider_lead_id` et réessais réseau = une seule fiche admissible; entreprise différente avec même téléphone = **pas** de fusion ni transfert de jeton.
- Consentement pour réponse unique et marketing non coché : seule demande ponctuelle autorisée, aucun envoi marketing; consentement absent ou faussement injecté par webhook : **pas d'autorisation de contacter**. La revue humaine CASL est obligatoire, jamais signée par l'agent.
- RBQ (si métier assujetti) et autres titres professionnels = statut `non vérifié` tant que preuve actuelle non confirmée; aucune recommandation automatisée d'entreprise non admissible.
- Tests RLS : anonyme, autre utilisateur/affilié et rôle CRM non habilité ne peuvent lire la PII ou récupérer le jeton d'une autre entreprise.
- Expiration, STOP, suppression et rétractation du consentement testés; aucune empreinte personnelle ou secret exposé en logs/analytics.
- Test de bout en bout sur **fixtures synthétiques** et environnement isolé; le formulaire ne peut ni provoquer ni attester un paiement. L'activation 350 $ reste réservée au webhook Stripe signé + entreprise unique + droit 12 mois.

## 4. Décision de lancement / état des preuves

- **Vérifié dans le code source** : formulaires cités et contrôles locaux décrits au §1, y compris la minimisation des en-têtes réseau dans le code fusionné #173. Aucune preuve de déploiement de ce correctif, d'intégration Meta/Google active, de budget autorisé ou de webhook signé entrant.
- **Non implémenté** : adaptateur fournisseur, unicité DB inter-sources, consentements versionnés complets et revue CASL de cette nouvelle voie.
- **Interdit par défaut** : création/activation de campagnes, envoi d'invitations, import de listes, auto-signature CASL, nouvelle dépense, migration SQL, modification de cron/flags ou déploiement.
- **Gates** : fermer d'abord le P0 #86 en environnement isolé, puis revue technique sécurité/privacy/RLS, revue CASL humaine, tests verts et autorisations séparées pour intégration, publication et médias. Ne jamais afficher une rareté de rendez-vous ou liste d'attente sans preuves de capacité fraîche et réelle.

Document préparatoire, pas preuve de conversion, de consentement valide, de sécurité de production ni d'acquisition activée.
