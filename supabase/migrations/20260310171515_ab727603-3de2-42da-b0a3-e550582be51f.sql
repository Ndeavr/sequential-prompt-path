-- Revert the FK added in 03-fix: user_roles should not depend on profiles
ALTER TABLE public.user_roles 
  DROP CONSTRAINT IF EXISTS user_roles_user_id_profiles_fkey;