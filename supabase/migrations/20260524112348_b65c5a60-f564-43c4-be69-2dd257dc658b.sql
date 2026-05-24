
INSERT INTO public.email_domain_configs (domain, from_email, reply_to, is_active, provider, health_score)
VALUES ('notify.unpro.ca', 'alex@notify.unpro.ca', 'bonjour@unpro.ca', true, 'lovable_email', 100)
ON CONFLICT (domain) DO UPDATE
SET from_email = EXCLUDED.from_email,
    reply_to  = EXCLUDED.reply_to,
    is_active = true,
    provider  = 'lovable_email',
    health_score = 100,
    updated_at = now();
