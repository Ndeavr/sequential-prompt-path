## Objectif
Verrouiller la voix `YxrwjAKoUKULGd0g8K9Y` comme voix unique d’Alex sur toutes les surfaces : démarrage voice agent, TTS, Voice Lab, profils backend et fallbacks.

## Constats
- La config principale `voice_configs` est déjà sur `YxrwjAKoUKULGd0g8K9Y`.
- Des anciens IDs restent actifs ailleurs : `alex_voice_profiles`, `voice_provider_configs`, `alex-tts`, `alex-voice-speak`, `alex-voice-get-config`, `voice-get-config` fallback, Voice Lab.
- Le voice agent ElevenLabs utilise surtout `agent_id`; le `voice_id` retourné par l’app ne force pas la voix si l’agent lui-même n’est pas configuré avec Sophia côté ElevenLabs. Le correctif app doit toutefois supprimer toute dérive interne et rendre le diagnostic évident.

## Plan d’implémentation
1. Créer une migration backend qui met à jour toutes les tables de configuration voix actives vers `YxrwjAKoUKULGd0g8K9Y` :
   - `voice_configs`
   - `alex_voice_profiles`
   - `voice_provider_configs`
   - mappings/logiques associées si présentes

2. Mettre à jour les Edge Functions TTS pour utiliser Sophia comme seule voix par défaut :
   - `alex-tts`
   - `alex-voice-speak`
   - `alex-voice-get-config`
   - `voice-get-config`
   - Supprimer les fallbacks vers les anciens IDs quand ils peuvent faire entendre une autre voix.

3. Verrouiller le frontend sur la même source :
   - garder `src/config/alexVoiceConfig.ts` sur `YxrwjAKoUKULGd0g8K9Y`
   - mettre à jour Voice Lab pour que “Production actuelle” pointe vers Sophia, sans afficher l’ancien `or4EV8aZq78KWcXw48wd` comme option active.

4. Ajouter une garde de diagnostic au démarrage voice :
   - logguer `agentId` + `voiceId` reçu
   - si `voiceId !== YxrwjAKoUKULGd0g8K9Y`, signaler une incohérence de configuration plutôt que démarrer silencieusement avec une autre voix.

5. Vérifier après build :
   - lecture backend des configs actives
   - recherche globale des anciens IDs encore utilisés comme fallback de production
   - validation que le démarrage retourne `voiceId: YxrwjAKoUKULGd0g8K9Y`

## Succès
- Sophia `YxrwjAKoUKULGd0g8K9Y` devient la voix unique partout.
- Aucun fallback de production ne peut jouer Charlotte/Laura/Sarah/ancienne Alex.
- Le Voice Lab reflète la vraie voix active.
- Si ElevenLabs joue encore une autre voix, l’app exposera clairement que l’agent `agent_5901...` doit être configuré avec Sophia côté ElevenLabs.