-- Update handle_new_user function to NOT auto-assign customer role
-- The role will be set by the edge function based on user choice

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create profile, do NOT insert role
  -- Role will be assigned by set-user-role edge function
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  RETURN NEW;
END;
$$;