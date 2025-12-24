
-- Add price_ow (one way) and price_rt (round trip) columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN price_ow numeric DEFAULT 0,
ADD COLUMN price_rt numeric DEFAULT 0;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.profiles.price_ow IS 'Additional fee for one-way flights (in KRW)';
COMMENT ON COLUMN public.profiles.price_rt IS 'Additional fee for round-trip flights (in KRW)';
