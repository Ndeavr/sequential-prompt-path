# Audit (lecture seule) — historique courriel des 5 entreprises du lot 1

Aucun envoi, aucune modification, aucune publication pendant cet audit. Seul changement antérieur, fait au tour précédent : les 4 entreprises déjà contactées ont été marquées « non admissibles » (`blocked_reason = email_sequence_exhausted_no_reply_2026-10-07`) dans `contractor_prospects`.

## Constat clé : deux fiches pour la même entreprise
L'historique d'envoi se trouve dans `verified_contractor_prospects` et dans les journaux CRM, sous les identifiants 128cc483 (Sicard), af4dc0b9 (MFC), bab42ecc (Mistral) et 3ee98026 (S.T. Air). La preuve CASL du lot 1, elle, est rattachée à une autre fiche dans `contractor_prospects`, avec d'autres identifiants et `outreach_status = not_started`. Rien ne relie les deux fiches.

## Origine, contenu et statut des anciens envois (commun à tous)
- **Origine :** automatisation `crm-automation-tick` → `crm-recovery-action` → `outreach-resend-send`, campagne Resend `crm_recovery`.
- **Objet :** « {Entreprise} — votre activation UNPRO est prête » (modèle `prospect-outreach`). Seul l'envoi `acquisition_onboarding_v1` vient d'un autre outil, et son objet n'est pas conservé.
- **Contenu :** le texte exact envoyé n'est pas stocké, seulement l'objet et l'ID Resend. Le modèle actuel (`outreachHtml`) a été modifié le 2 et le 13 septembre, donc la version réellement envoyée n'est pas vérifiable.
- **Statut fournisseur :** chaque envoi a seulement été **accepté** par Resend (ID reçu). Aucune trace de livraison, de rebond ou de plainte n'existe dans `outreach_email_events`, `acq_email_logs` ou `acquisition_events`. Un envoi accepté n'est pas un envoi livré : la livraison n'est pas prouvée.
- **Réponses, désinscriptions, suppressions :** aucune réponse dans `outreach_reply_events`, aucune désinscription dans `outreach_unsubscribes`, aucune suppression dans `outreach_suppressions` ni `suppressed_emails`.

## Par entreprise

### Excavation Sicard — info@excavationsicard.ca
- **SMS :** le 11 août (livré), relance le 13 août.
- **Courriels (règle `second_sms_48h_no_click`, ID Resend entre parenthèses) :**
  - 15 août (e22aa367), alex@mail.unpro.ca
  - 22 août (d4cb9d33), alex@mail.unpro.ca
  - 29 août (944f3ddd), alex@mail.unpro.ca
  - 5 sept. (6c3f7843), clara@mail.unpro.ca
- **Lien suivi :** jeton 48ada75f…, 0 clic.
- **Intérêt :** aucun.

### VENTILATION MFC — mfrancoeur@ventilationmfc.ca
- **SMS :** le 28 août à 15:15, non livré (erreur 30006, ligne fixe).
- **Courriels (ID Resend entre parenthèses) :**
  - 28 août 15:18 : `acquisition_onboarding_v1` (a2d1dee9), alex@
  - 28 août 15:30 : `onboarding_email` (00198fca), alex@
  - 29 août : `send_email` (e2dce44e), alex@
  - 4 sept. : `onboarding_email` (aebb2200), clara@
  - 5 sept. : `send_email` (00a714d6), clara@
- **Clics :** premier clic le 28 août à 15:18:42, soit 28 s après le premier courriel, et page d'activation ouverte à 15:18:43. Au total, 9 clics.
- **Paiement :** la vue CRM indique un paiement lancé le 2 sept. à 18:57. Aucune session de paiement correspondante n'existe dans `checkout_sessions` : l'origine de cette valeur n'est pas vérifiée.
- **Inscription, code de vérification, paiement :** aucun.

### MISTRAL VENTILATION — n.constantineau@mistralventilation.com
- **SMS :** le 28 août (livré), relance ensuite.
- **Courriels (ID Resend entre parenthèses) :**
  - 2 sept. 19:00 : `onboarding_email` (01a0637e), alex@
  - 3 sept. : `send_email` (db727e79), clara@
- **Clics :** 1 clic le 2 sept. à 19:01:00, soit environ 40 s après le courriel, puis page ouverte.
- **Suite :** aucune inscription.

### S.T. AIR VENTILATION — stairventilation@videotron.ca
- **SMS :** le 28 août à 15:15:37 (livré).
- **Clics :** 1 clic à 15:17:06, soit environ 90 s après le SMS, puis page ouverte.
- **Courriels (règle `clicked_24h_no_registration`, ID Resend entre parenthèses) :**
  - 29 août (3d101002), alex@
  - 5 sept. (d2afa807), clara@
- **Suite :** aucune inscription.

### Maple Wood Painting — info@maplewoodpainting.ca
Aucun envoi, aucun jeton et aucune fiche CRM : jamais contactée.

## Intérêt humain : rien de prouvé
Les seuls signaux sont des clics suivis d'une ouverture de page, survenus 28 à 90 s après l'envoi. Ce délai correspond au profil des robots anti-pourriels qui visitent les liens, sans en être la preuve. Aucune inscription, aucun code de vérification, aucun paiement. Le seul signal fort serait le « paiement lancé » de MFC, mais il ne repose sur aucune session de paiement trouvée.

## Pourquoi les 5 sortaient « admissibles »
1. **Requête sur la mauvaise fiche :** la vérification du lot portait sur `contractor_prospects`. Pour cette fiche, `do_not_contact = false`, `outreach_status = not_started`, la preuve CASL est valide et il n'y a ni désinscription ni suppression.
2. **Cadence :** la seule règle de délai appliquée était l'attente de 30 jours depuis le dernier envoi, soit le 5 sept., donc admissible depuis le 5 oct.
3. **Relances illimitées :** `crm-automation-tick` n'empêche que de répéter la même action dans les 7 jours. Le nombre total de relances n'a pas de limite. Ainsi, `onboarding_email` et `send_email` ont alterné chaque semaine pour Sicard et MFC.
4. **Absence de réaction ignorée :** aucune règle ne compte les envois sans clic humain ni réponse.

## À signaler selon les règles actuelles (sans changement de règle)
- **Ont reçu plusieurs envois sans réaction prouvée :** Sicard (2 SMS + 4 courriels), MFC (5 courriels), Mistral (SMS + 2 courriels), S.T. Air (SMS + 2 courriels).
- **Changement d'expéditeur :** les envois sont passés de « Alex d'UNPRO <alex@mail.unpro.ca> » à « Clara d'UNPRO <clara@mail.unpro.ca> » vers le 3 sept.

## Pistes à valider, non appliquées
- Relier `contractor_prospects` et `verified_contractor_prospects` par courriel ou téléphone pour toute future vérification de doublon.
- Limiter le nombre total de relances sans réponse.
- Vérifier d'où vient la valeur « paiement lancé » de MFC.
