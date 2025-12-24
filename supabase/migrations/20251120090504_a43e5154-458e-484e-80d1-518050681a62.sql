-- Add ticket sending email and phone columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN ticket_email text,
ADD COLUMN ticket_phone text;

-- Add comments explaining the columns
COMMENT ON COLUMN public.profiles.ticket_email IS 'Email address for sending flight tickets';
COMMENT ON COLUMN public.profiles.ticket_phone IS 'Phone number for sending flight tickets (format: +84xxxxxxxxx or +82xxxxxxxxx)';