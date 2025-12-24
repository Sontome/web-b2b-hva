
-- Add status field to profiles table to control user activation
ALTER TABLE public.profiles ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive'));

-- Update existing users to active status (optional - you can manually set these in Supabase dashboard)
-- UPDATE public.profiles SET status = 'active';

-- Update the handle_new_user function to set default status as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    CASE 
      WHEN NEW.email = 'admin@example.com' THEN 'admin'
      ELSE 'user'
    END,
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
