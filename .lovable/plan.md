# Lot 1 — 5 courriels de prospection, mesurés de bout en bout

## Condition de départ (obligatoire)
Le lot ne part que si Yan confirme avoir reçu le courriel test Resend (ID `01a117e7-…`, expéditeur `clara@mail.unpro.ca`) dans sa boîte de réception, et non dans les indésirables. Le statut « HTTP 200 » seul ne suffit pas. S'il est dans les indésirables, on s'arrête et on traite la délivrabilité avant tout envoi.

## Cohorte (fixée, 5 contacts)
VENTILATION MFC, MISTRAL VENTILATION, S.T. AIR VENTILATION, Excavation Sicard, Maple Wood Painting. Ce sont les seuls contacts avec une preuve de source publique enregistrée.
Juste avant l'envoi, on vérifie de nouveau chaque contact : pas de désinscription, pas de suppression, pas de doublon dans la période d'attente, licence non invalide, aucun paiement ou activation déjà faits, contact hors QA. Un contact qui échoue à une vérification est retiré, sans remplacement.

## Envoi
- On utilise le chemin de prospection existant (Resend, `mail.unpro.ca`). Le service Lovable Email reste réservé aux courriels transactionnels.
- Les 5 courriels partent un par un, entre 9 h et 17 h (heure de Toronto). On reste sous le plafond partagé de 25 par canal et par jour.
- Chaque courriel est personnalisé en français québécois, signé Clara. Il contient un lien suivi propre à chaque contact vers le parcours validé 7/7, le pied de désinscription CASL et l'adresse de l'expéditeur.
- L'offre présentée est l'entente de départ actuelle fixée par le serveur. Aucune mention du 1 $, aucun prix codé en dur, aucune fausse rareté.
- La prospection est activée uniquement pour ce lot, puis désactivée tout de suite après. Le Lookup payant reste éteint.
- Chaque envoi a une clé unique, ce qui empêche tout double envoi.

## Mesure par contact
envoyé (ID Resend) → livré (événement Resend ou statut d'API) → clic (lien suivi) → onboarding commencé → paiement lancé → payé → activé.
Pour chaque étape, on indique si elle est vérifiée ou seulement en attente. Les clics des robots anti-pourriels qui visitent les liens sont signalés à part.

## Rapport
Pour chaque entreprise : l'ID Resend, le statut de livraison, le clic, l'étape atteinte. On rapporte aussi les exclusions de dernière minute et leur raison exacte, ainsi que l'état final des interrupteurs (prospection OFF, Lookup OFF). Aucun suivi automatique dans ce tour.

## Hors périmètre
Pas de modification DNS, pas de nouveau tableau de bord, pas de nouveau système, pas de SMS, aucun autre contact que ces 5.
