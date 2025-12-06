-- Add column for VNA issued ticket check feature
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS perm_check_vna_issued boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.perm_check_vna_issued IS 'When true, check VNA PNR payment status before adding to price monitor and before auto-hold';