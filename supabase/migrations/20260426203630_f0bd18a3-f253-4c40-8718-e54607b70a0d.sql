-- Add V2 ElevenLabs voice tuning columns to voice_configs
ALTER TABLE public.voice_configs
  ADD COLUMN IF NOT EXISTS stability NUMERIC(4,3) NOT NULL DEFAULT 0.560,
  ADD COLUMN IF NOT EXISTS similarity NUMERIC(4,3) NOT NULL DEFAULT 0.840,
  ADD COLUMN IF NOT EXISTS style NUMERIC(4,3) NOT NULL DEFAULT 0.140,
  ADD COLUMN IF NOT EXISTS speaker_boost BOOLEAN NOT NULL DEFAULT TRUE;

-- Apply V2 defaults to the active prod row
UPDATE public.voice_configs
SET stability = 0.560,
    similarity = 0.840,
    style = 0.140,
    speaker_boost = TRUE
WHERE environment = 'prod' AND status = 'active';