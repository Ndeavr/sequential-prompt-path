## Problem

Creating a property fails with **"permission denied for table users"**.

Root cause found in the database:

- The `properties` INSERT succeeds, but PostgREST then re-`SELECT`s the row (to return it to the client).
- That triggers the SELECT policy `Shared users can read property` on `properties`, which does `EXISTS (SELECT 1 FROM property_shares ps ...)`.
- Evaluating that sub-select fires RLS on `property_shares`, whose policy `Shared user sees own invitations` contains:

  ```sql
  shared_with_email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())
  ```

- The `authenticated` role does not have SELECT on `auth.users` → Postgres raises `permission denied for table users`, which bubbles up as the toast the user sees.

Bonus bug also spotted (not the cause, but broken): the `Shared users can read property` policy has `ps.property_id = ps.id` — self-join on the same alias — should be `ps.property_id = properties.id`.

## Fix (single migration)

1. Replace the `property_shares` policy so it uses the JWT email claim instead of hitting `auth.users`:

   ```sql
   DROP POLICY "Shared user sees own invitations" ON public.property_shares;
   CREATE POLICY "Shared user sees own invitations"
     ON public.property_shares FOR SELECT
     TO authenticated
     USING (
       shared_with_user_id = auth.uid()
       OR lower(shared_with_email) = lower(auth.jwt() ->> 'email')
     );
   ```

2. Fix the broken join in the `properties` SELECT policy:

   ```sql
   DROP POLICY "Shared users can read property" ON public.properties;
   CREATE POLICY "Shared users can read property"
     ON public.properties FOR SELECT
     TO authenticated
     USING (
       user_id = auth.uid()
       OR EXISTS (
         SELECT 1 FROM public.property_shares ps
         WHERE ps.property_id = properties.id
           AND ps.status = 'accepted'
           AND ps.shared_with_user_id = auth.uid()
       )
     );
   ```

No frontend changes required. After the migration, "Créer la propriété" will succeed and return the new row without the permission error.

## Verification

- Re-run the create-property flow from `/dashboard/properties/new`; expect success toast + redirect to the new property page.
- Confirm no regression on shared-property listing for users invited by email.
