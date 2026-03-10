
-- Add FK from user_roles.user_id to profiles.user_id so Supabase relational queries work
-- profiles.user_id is UNIQUE so this is valid
ALTER TABLE public.user_roles 
  ADD CONSTRAINT user_roles_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
