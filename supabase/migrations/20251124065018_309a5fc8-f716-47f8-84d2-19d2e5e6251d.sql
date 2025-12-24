-- Add Telegram notification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN apikey_telegram text,
ADD COLUMN idchat_telegram text;