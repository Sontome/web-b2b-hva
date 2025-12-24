-- Update the handle_new_user function to include new fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
begin
  insert into public.profiles (id, full_name, phone, linkfacebook, agent_name, address, business_number)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'fullName', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'linkfacebook',
    new.raw_user_meta_data->>'agent_name',
    new.raw_user_meta_data->>'address',
    new.raw_user_meta_data->>'business_number'
  );
  
  -- Assign default 'user' role
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;