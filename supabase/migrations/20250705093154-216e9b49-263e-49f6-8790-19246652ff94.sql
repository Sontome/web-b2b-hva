
-- Add phone and linkfacebook columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN phone TEXT,
ADD COLUMN linkfacebook TEXT;
