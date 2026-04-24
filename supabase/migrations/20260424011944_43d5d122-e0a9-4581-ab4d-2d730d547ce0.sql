-- Lock Alex master voice to UJCi4DDncuo0VJDSIegj — French only
UPDATE public.alex_voice_profiles
SET voice_id_primary = 'UJCi4DDncuo0VJDSIegj',
    is_active = true
WHERE language = 'fr';

-- Deactivate all English voice profiles (French-only policy)
UPDATE public.alex_voice_profiles
SET is_active = false
WHERE language = 'en';

-- Update voice_configs to lock master voice (FR only)
UPDATE public.voice_configs
SET voice_id = 'UJCi4DDncuo0VJDSIegj',
    language_default = 'fr',
    allow_switch = false
WHERE status = 'active';

-- Promote elevenlabs_primary (UJCi...) and demote alternates
UPDATE public.voice_provider_configs
SET is_active = true, is_primary = true
WHERE provider_name = 'elevenlabs_primary';

UPDATE public.voice_provider_configs
SET is_primary = false
WHERE provider_name <> 'elevenlabs_primary';