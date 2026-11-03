# Lot fermé — 2 courriels (préparé 3 nov 2026, NON ENVOYÉ)

Statut : brouillons uniquement. Aucun envoi, aucune file insérée, aucun interrupteur modifié.

## Preuves lues (lecture seule, 3 nov 2026)

| | Maple Wood Painting & Home Improvement | Excavation Sicard |
|---|---|---|
| Prospect | 8856168a-a61e-4fa1-a893-d51077dcd90e | 3f59b337-9b97-4a42-b531-673e9fff936d |
| Preuve CASL | cd0840bf… is_valid=true, humain 23 oct, refus=false, SHA 21914535… | f247a859… is_valid=true, humain 23 oct, refus=false, SHA 21ecab44… |
| Source | https://www.maplewoodpainting.ca/ (site officiel) | https://excavationsicard.ca/ (site officiel) |
| suppressed_emails / suppression_index | aucune entrée | aucune entrée |
| do_not_contact | false | false |
| Historique courriel (email_send_log) | aucun envoi trouvé (outreach_status=sent : canal non identifié) | 4 envois 15 août → 5 sept 2026, sans réponse |
| blocked_reason | — | `email_sequence_exhausted_no_reply_2026-10-07` |
| Cooldown 7 j | respecté | respecté (dernier : 5 sept) |
| Licence RBQ | 5874-2479-01 **déclarée, non vérifiée** (rbq_verified=false) | 5836-5529-01 **déclarée, non vérifiée** |
| Langue | en | fr |

Recommandation : **Maple Wood seul** (peinture/finition intérieure, adapté à l'hiver). Sicard : séquence déjà épuisée sans réponse → ne pas relancer dans ce lot.
Avant tout envoi : vérifier la licence RBQ au registre (non faite ici).

URL vérifiées (HTTP 200) : https://unpro.ca/entrepreneurs/activation-350 , https://unpro.ca/unsubscribe

## Mode d'exécution — blocage exact

`outreach-resend-send` exige `system_flags.OUTREACH_ENABLED=true` **et** `outreach_autopilot_gate.gated=false` avec `operational_score ≥ 95` (actuel : gated=true, score 30). Aucune liste fermée commerciale n'existe ; `isAllowlistedDiagnostic` ne couvre que les envois de diagnostic admin (non commerciaux). Donc :
- ouvrir les drapeaux = ouvrir aussi l'ancienne file → refusé ;
- envoi limité sûr = **petit changement de code requis** : une exemption serveur pour une liste fermée d'IDs de preuve (ex. drapeau dédié + liste d'`evidence_id`), conservant suppression, claim atomique `claim_outreach_email`, plafond, heures et lien de désinscription. Nécessite votre autorisation.

Le lien de désinscription réel est généré par `outreach-resend-send` au moment de l'envoi (`email_unsubscribe_tokens` → https://unpro.ca/unsubscribe?token=…). Adresse postale : 281, rue Saint-Paul, Montréal (Québec) H2Y 1H1, Canada.

## Brouillon 1 — Maple Wood (prioritaire)

Objet : Profil UNPRO pour Maple Wood Painting — activation 350 $ + taxes

Bonjour Jordan,

J'ai vu sur maplewoodpainting.ca que vous faites de la peinture, de la finition et des travaux intérieurs à Verdun et dans les environs.

UNPRO aide les propriétaires du Québec à trouver le professionnel le plus compatible avec leur projet. Je vous propose d'activer le profil de Maple Wood Painting :

- Activation unique : 350 $ + taxes (402,41 $ avec TPS et TVQ)
- Profil UNPRO et 12 mois de présence IA UNPRO
- Aucun rendez-vous n'est inclus par défaut. Si vous en voulez, une option séparée vous est proposée, avec prix et conditions affichés avant tout paiement.

Activer le profil : https://unpro.ca/entrepreneurs/activation-350

Merci,
L'équipe UNPRO

—
English: UNPRO helps Quebec homeowners find the most compatible professional. One-time profile activation: CAD 350 + tax (CAD 402.41 with GST/QST), including 12 months of UNPRO AI presence. No appointments are included by default.

UNPRO — 281, rue Saint-Paul, Montréal (Québec) H2Y 1H1, Canada
Vous recevez ce message parce que votre courriel est publié sur votre site d'entreprise. Se désinscrire : {lien généré à l'envoi}

## Brouillon 2 — Excavation Sicard (déconseillé pour ce lot)

Objet : Profil UNPRO pour Excavation Sicard — activation 350 $ + taxes

Bonjour,

Votre courriel est publié sur excavationsicard.ca, où vous présentez vos services d'excavation.

UNPRO aide les propriétaires du Québec à trouver le professionnel le plus compatible avec leur projet. Activation du profil d'Excavation Sicard :

- Activation unique : 350 $ + taxes (402,41 $ avec TPS et TVQ)
- Profil UNPRO et 12 mois de présence IA UNPRO
- Aucun rendez-vous n'est inclus par défaut ; une option séparée existe, avec prix et conditions affichés avant paiement.

Activer le profil : https://unpro.ca/entrepreneurs/activation-350

Merci,
L'équipe UNPRO

UNPRO — 281, rue Saint-Paul, Montréal (Québec) H2Y 1H1, Canada
Se désinscrire : {lien généré à l'envoi}

## Stripe
Vérifié par le fondateur le 3 nov 2026 : aucun paiement LIVE à 350 $ ; seulement trois anciennes charges internes à 1 $. 0 activation 350 payée confirmée.
