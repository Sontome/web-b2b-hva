
-- Update profiles table to ensure price_markup column exists with proper default
ALTER TABLE public.profiles 
ALTER COLUMN price_markup SET DEFAULT 0;

-- Make sure existing users have default markup
UPDATE public.profiles 
SET price_markup = 0 
WHERE price_markup IS NULL;
