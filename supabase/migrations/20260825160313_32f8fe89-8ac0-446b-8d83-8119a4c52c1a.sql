-- Lock down the new payment-conversion RPC: service role only.
REVOKE EXECUTE ON FUNCTION public.record_affiliate_payment_conversion(uuid, uuid, uuid, integer, text, uuid, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_affiliate_payment_conversion(uuid, uuid, uuid, integer, text, uuid, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_affiliate_payment_conversion(uuid, uuid, uuid, integer, text, uuid, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.record_affiliate_payment_conversion(uuid, uuid, uuid, integer, text, uuid, text, jsonb) TO service_role;