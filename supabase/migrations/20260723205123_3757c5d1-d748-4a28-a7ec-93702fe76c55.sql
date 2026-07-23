
-- Reconcile SMS statuses with Twilio ground truth (2026-07-23 first-dollar run)
UPDATE outreach_messages
SET message_status='delivered', delivered_at=COALESCE(delivered_at, now()), error_message=NULL, failed_at=NULL
WHERE provider_message_id IN (
  'SM392273ac2c69e2770533912921111136',
  'SM96e92bd42eeaa3cdf6f0fec5f537ff42',
  'SM22b38b2cd45e3c85177ef16b6acf8832',
  'SMf00f4cb9aa58cd5f35e93df9561c46b2'
);

UPDATE outreach_messages
SET message_status='undelivered',
    failed_at=COALESCE(failed_at, now()),
    error_message='30006 Landline or unreachable carrier'
WHERE provider_message_id = 'SM9c69cf7a469bf868f537a4b1dbba2985';
