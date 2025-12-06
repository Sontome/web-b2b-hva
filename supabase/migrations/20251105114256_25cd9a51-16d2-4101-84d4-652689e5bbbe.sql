-- Update default value for price_markup to 10000
ALTER TABLE public.profiles 
ALTER COLUMN price_markup SET DEFAULT 10000;