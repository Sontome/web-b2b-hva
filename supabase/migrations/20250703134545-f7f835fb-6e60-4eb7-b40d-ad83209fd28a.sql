
-- Add price_vj and price_vna columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN price_vj numeric DEFAULT 0,
ADD COLUMN price_vna numeric DEFAULT 0;

-- Add comments to explain the new columns
COMMENT ON COLUMN public.profiles.price_vj IS 'Additional fee for VietJet flights (in KRW)';
COMMENT ON COLUMN public.profiles.price_vna IS 'Additional fee for Vietnam Airlines flights (in KRW)';
