-- Finding: every public profile said "no credentials" because the public read
-- only covered contractor_credentials, while RBQ/NEQ are stored on contractors.
-- Surface those as DECLARED (never verified) so the truth layer stays honest.
CREATE OR REPLACE FUNCTION public.public_contractor_credentials(_contractor_id uuid)
 RETURNS TABLE(id uuid, credential_type text, profession_code text, issuer text, public_value text, verification_state text, credential_status text, issued_at date, expires_at date, verified_at timestamp with time zone, source_last_verified_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH rows AS (
    SELECT
      c.id,
      c.credential_type,
      c.profession_code,
      c.issuer,
      CASE
        WHEN lower(coalesce(c.credential_type, '')) IN ('rbq', 'neq', 'licence', 'license')
          THEN c.credential_value
        WHEN c.credential_value IS NULL THEN NULL
        ELSE '••••' || right(c.credential_value, 3)
      END AS public_value,
      CASE
        WHEN c.expires_at IS NOT NULL AND c.expires_at < current_date THEN 'PENDING'
        ELSE coalesce(c.verification_state, 'PENDING')
      END AS verification_state,
      CASE
        WHEN c.expires_at IS NOT NULL AND c.expires_at < current_date THEN 'EXPIRED'
        ELSE coalesce(c.credential_status, 'UNVERIFIED')
      END AS credential_status,
      c.issued_at,
      c.expires_at,
      c.verified_at,
      c.source_last_verified_at
    FROM public.contractor_credentials c
    WHERE c.contractor_id = _contractor_id
  ),
  declared AS (
    SELECT * FROM (
      SELECT
        k.id,
        k.credential_type,
        NULL::text AS profession_code,
        k.issuer,
        k.public_value,
        'PENDING'::text AS verification_state,
        'DECLARED'::text AS credential_status,
        NULL::date AS issued_at,
        NULL::date AS expires_at,
        NULL::timestamptz AS verified_at,
        NULL::timestamptz AS source_last_verified_at
      FROM public.contractors ct
      CROSS JOIN LATERAL (
        VALUES
          (md5(ct.id::text || ':rbq')::uuid, 'RBQ', 'Régie du bâtiment du Québec', nullif(btrim(ct.rbq_number), '')),
          (md5(ct.id::text || ':neq')::uuid, 'NEQ', 'Registraire des entreprises du Québec', nullif(btrim(ct.neq), ''))
      ) AS k(id, credential_type, issuer, public_value)
      WHERE ct.id = _contractor_id
    ) d
    WHERE d.public_value IS NOT NULL
      -- A real credential row always wins over the declared field.
      AND NOT EXISTS (
        SELECT 1 FROM rows r
        WHERE upper(coalesce(r.credential_type, '')) = d.credential_type
      )
  )
  SELECT * FROM rows
  UNION ALL
  SELECT * FROM declared
  ORDER BY credential_type;
$function$;

GRANT EXECUTE ON FUNCTION public.public_contractor_credentials(uuid) TO anon, authenticated, service_role;