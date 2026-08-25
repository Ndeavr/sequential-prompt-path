# Mode Action affilié — Trouver → Appeler → Envoyer → Suivre → Gagner

Objectif : une affiliée ouvre une page, comprend quoi faire en 5 secondes, et enchaîne les appels sans jamais toucher au CRM.

## Ce qui existe déjà (vérifié) et sera réutilisé, pas dupliqué

- `/affiliate` = « Salle de guerre » (CRM complet, buckets, pipeline commissions).
- Prospects affiliés : table `contractor_leads` (assigned_affiliate_id, created_by_affiliate_id, phone_e164, contact_status, next_follow_up_at, consentement, sms_eligible, do_not_contact) + RLS `is_affiliate_owner`.
- Assignations admin : `affiliate_assignments` (prospect_id → `contractors_prospects`, priority, status).
- Journal d'actions : `affiliate_lead_events` (déjà écrit par la war room).
- Ajout rapide + dédoublonnage : `AddLeadSheet`, `useAddLead`, fonction `lead-dedupe-check`.
- Évaluation IA : page `/entrepreneurs/audit-ia`, fonction `ai-recommendation-audit` (actions search / audit / claim / event), tables `ai_recommendation_audits` + `ai_recommendation_audit_events`.
- Envois : `send-sms-prospect` → `_shared/twilioSend.ts` (opt-out, cooldown, statut webhook Twilio), Resend pour le courriel.
- Commissions : `affiliate_conversions`, `affiliate_commissions`, override 5 % sous-affiliés.

Aucune nouvelle table de prospects, d'audit, d'envoi ou de commission ne sera créée.

## Ce qui sera construit

### 1. Nouvelle page « Mode Action »
- Route `/affiliate` devient le Mode Action (mobile-first). Le CRM actuel reste intact, déplacé sur `/affiliate/crm` (lien discret dans le menu affilié). Admin : aucun changement.
- En-tête : « Bonjour [Prénom] 👋 » + « Votre objectif aujourd'hui : envoyer des évaluations IA à des entrepreneurs. »
- 5 grosses cartes numérotées, une seule ouverte à la fois, les terminées se replient, fil de progression 1 → 5.
- Barre fixe en bas, bouton bleu UNPRO : 📞 CONTACTER LE PROCHAIN PROSPECT.

### 2. Les 5 étapes
1. **Trouver** — « Dans ma liste » (meilleur prochain prospect réel) ou « + Trouver une entreprise » (formulaire ultra court nom + téléphone, champs optionnels, dédoublonnage avant création via la fonction existante ; si doublon probable → proposer la fiche existante). Actions COMMENCER / PASSER, avec raison enregistrée (pas pertinent, mauvais numéro, déjà contacté, pas maintenant, autre).
2. **Appeler** — téléphone très gros, bouton 📞 APPELER, script d'appel affiché, rappel « le but n'est pas de vendre ». Résultat en gros boutons : Intéressé / Envoyer l'évaluation / Rappeler / Pas de réponse / Pas intéressé. Enregistre affiliée, prospect, date, résultat, prochain suivi, canal.
3. **Envoyer** — SMS ou Courriel, message prérempli avec le lien d'évaluation réel, unique et attribué (jamais de lien générique). Envoi via les fonctions Twilio/Resend existantes, avec les gardes de consentement/CASL/opt-out déjà en place. Consigne : sent_at, canal, affiliée, prospect, audit, statut de livraison.
4. **Suivre** — barre Envoyée ✓ → Ouverte → Commencée → Terminée alimentée uniquement par de vraies données d'audit. Rappel possible si non ouverte, relance si commencée non terminée. Terminée → 🔥 ÉVALUATION TERMINÉE puis « UNPRO PREND LA RELÈVE » : le prospect bascule automatiquement dans le pipeline existant (statut de lead + assignation), sans action de l'affiliée.
5. **Gagner** — chiffres réels du jour : contactés, évaluations envoyées, complétées, opportunités. Commissions affichées seulement si calculables depuis `affiliate_conversions`/`affiliate_commissions`, sinon « Conversions attribuées : X ». Objectif du jour avec barre de progression.

### 3. Intelligence « prochain prospect »
Priorisation réutilisant les scores existants (priority_score, fit_score, next_follow_up_at, statut de contact) : suivi dû > téléphone + contact nommé > téléphone > courriel seul > à rechercher. Verrou léger anti-collision (prospect « en cours » réservé quelques minutes à une affiliée) pour éviter deux affiliées sur le même prospect. Le clic sur le CTA fixe sauvegarde l'état courant avant de charger le suivant : aucune note ni statut perdu.

### 4. Admin & traçabilité
Chaque action alimente `affiliate_lead_events` (appel, résultat, envoi, ouverture, complétion, transfert, doublon, saut). Une vue admin « Activité affiliées » relie affiliée → prospect → source → appels → audits envoyés/ouverts/complétés → réclamations → conversions → commissions.

### 5. États et erreurs
Chargement, aucun prospect disponible, téléphone/courriel manquant, SMS non admissible ou opt-out, erreur Twilio/Resend, audit déjà envoyé, prospect déjà réclamé, doublon, conversion déjà attribuée — chacun avec une action utile proposée (ex. « pas de numéro → envoyer par courriel »).

## Détails techniques

- Migration : colonnes d'attribution sur `ai_recommendation_audits` (`affiliate_id`, `lead_id`, `invite_token`, `channel`, `sent_at`, `opened_at`, `started_at`) + index ; nouvelle table minimale `affiliate_prospect_locks` (prospect, affiliée, expires_at) pour l'anti-collision ; RLS stricte : l'affiliée ne voit que ses lignes, l'admin tout. GRANT explicites (`authenticated`, `service_role`).
- Nouvelle fonction edge `affiliate-next-prospect` (sélection + verrou, service role, filtrée sur l'affiliée authentifiée) et `affiliate-send-audit` (génère/rattache l'audit, construit le lien tracké, délègue à `send-sms-prospect` / Resend, écrit les événements). Aucune duplication de la logique d'envoi.
- Le lien envoyé pointe vers `/entrepreneurs/audit-ia?t=<invite_token>` ; ouverture/démarrage/complétion écrivent dans `ai_recommendation_audit_events`, source unique du suivi de l'étape 4.
- Front : `src/features/affiliate/actionMode/` (5 cartes, CTA fixe, hooks) réutilisant `AddLeadSheet`, `messageBuilder`, `logLeadEvent`, design UNPRO existant.
- Aucun faux prospect, audit, statistique ou commission. Aucun envoi de masse : uniquement les envois déclenchés par l'affiliée.

## Vérification
Build + typecheck, tests ciblés, puis parcours complet en préproduction sur une vraie affiliée de test : prochain prospect → appel → résultat → audit généré → envoi → suivi → complétion → transfert UNPRO → statistiques. Priorité au rendu mobile (390 px) puis desktop.
