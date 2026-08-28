update public.verified_contractor_prospects
set email_eligible = true,
    email_eligibility_reason = 'sms_undelivered_carrier',
    email_eligible_at = now(),
    fallback_reason = 'sms_undelivered',
    updated_at = now()
where id = 'af4dc0b9-b269-474d-90fc-9e98efc2eb26'
  and email is not null;