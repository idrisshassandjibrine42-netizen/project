-- Create function + trigger to auto-create user_profiles on auth.users insert
-- This ensures a profile is created server-side (avoids RLS insert failure from clients)

CREATE OR REPLACE FUNCTION public.create_user_profile_on_auth_insert()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, full_name, email, created_at, updated_at)
  VALUES (
    NEW.id,
    split_part(NEW.email::text, '@', 1),
    NEW.email,
    now(),
    now()
  ) ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function after a new auth user is created
CREATE TRIGGER create_user_profile_after_auth_user_insert
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.create_user_profile_on_auth_insert();
