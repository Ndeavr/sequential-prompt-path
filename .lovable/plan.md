# Carte d'aide humaine — déclenchement intelligent

Aujourd'hui la carte « Vous voulez être recommandé par l'IA? » s'ouvre automatiquement 5 secondes après l'arrivée sur presque toute page entrepreneur, dès que l'utilisateur ne tape pas. C'est un pop-up, pas une aide.

Elle devient une aide de dernier recours : Clara d'abord, l'humain seulement quand une inscription ou une activation est réellement en train de se perdre.

## Comportement visé

1. **Délai minimum de 15 secondes.** Le temps écoulé ne déclenche jamais rien à lui seul — il rend seulement la carte admissible.
2. **Il faut un vrai signal de blocage :**
   - aucune progression réelle depuis 15 s ou plus;
   - plusieurs erreurs de validation dans un même écran;
   - clics répétés sur le même bouton sans que rien n'avance;
   - aller-retour entre les deux mêmes étapes;
   - abandon apparent d'une étape importante (champ ouvert puis laissé en plan);
   - Clara a posé une question et rien ne se passe;
   - échec réel de paiement, de profil, de calendrier ou d'activation qui empêche de continuer.
3. **Clara aide en premier.** Une invitation légère apparaît d'abord : « Besoin d'un coup de main avec cette étape? » avec la possibilité de l'ignorer. La carte humaine n'arrive que si la personne reste bloquée ou échoue de nouveau après cette invitation.
4. **Jamais pendant** que l'utilisateur écrit, parle avec Clara, attend un chargement ou une réponse, remplit normalement un formulaire, est dans la connexion du calendrier, est dans le paiement, vient de changer d'étape, ou consulte tranquillement son score IA ou son profil.
5. **Fermeture facile, une seule fois par session.** Un X bien visible; une fois fermée elle ne revient pas, sauf si une erreur critique clairement différente survient plus tard.

## La carte

- Titre : **Besoin d'aide pour continuer?**
- Sous-titre : Parlez à un humain maintenant.
- Bouton principal : **Appeler (514) 249-9522**
- Bouton secondaire : **Continuer avec Clara** — ouvre réellement Clara au lieu de simplement fermer la carte.
- Heures d'ouverture conservées.

## Mesure

Chaque étape est enregistrée avec la raison exacte du déclenchement, pour savoir plus tard où les entrepreneurs bloquent vraiment :

`human_help_eligible`, `human_help_shown`, `human_help_dismissed`, `human_help_call_clicked`, `human_help_continue_clara`, et la raison (`human_help_trigger_reason`) portée par chacun.

## Détails techniques

- `src/lib/support/struggleSignals.ts` (nouveau) : petit détecteur sans dépendance qui compte les clics répétés sur une même cible, les erreurs de validation (`aria-invalid`, rôles d'alerte), les allers-retours de route, l'inactivité après une question de Clara, et expose `reportStuckSignal(reason, { critical })` pour que le paiement, l'activation, le profil et le calendrier signalent un échec bloquant. Chaque signal garde un libellé de raison stable.
- `src/hooks/useContractorHumanCallout.ts` : réécrit autour de ce détecteur. Fenêtre minimale de 15 s, liste de suppression (saisie en cours, overlay Clara ouvert, requête en vol, routes `/checkout`, `/calendar`, `/oauth`, changement de route depuis moins de 5 s), machine à deux temps (invitation Clara → carte humaine), verrou de session sauf nouvelle raison critique distincte.
- `src/config/contractorHumanCallout.ts` : nouveaux textes, `minDwellMs: 15000`, seuils de signaux, clés de session séparées pour l'invitation Clara et pour la carte.
- Nouveau composant léger pour l'invitation Clara (bandeau bas, non modal) — la carte humaine reste le `Dialog` existant.
- `ContractorHumanCalloutModal.tsx` : nouveaux libellés; « Continuer avec Clara » appelle `openAlex` via `AlexVoiceContext` avec le contexte de l'étape bloquée.
- `src/lib/analytics/logFunnelEvent.ts` : ajout des six types d'événements, avec `metadata.trigger_reason`, la route et l'étape.
- Tests : `src/test/human-help-card.test.ts` — pas d'affichage avant 15 s, pas d'affichage sans signal, suppression pendant saisie/checkout/calendrier, invitation Clara avant la carte, une seule apparition par session, réapparition sur erreur critique distincte, raison journalisée.

## Ce que je ne touche pas

Le parcours de paiement, l'activation NICK, le calendrier, le matching et l'enrichissement restent inchangés. Aucune donnée fabriquée, aucun envoi automatique.
